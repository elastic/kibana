/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { merge } from 'lodash';

import { getRegistryDataStreamAssetBaseName } from '../../../common/services';

import type { ExperimentalIndexingFeature } from '../../../common/types';
import type { NewPackagePolicy, PackagePolicy } from '../../types';
import { prepareTemplate } from '../epm/elasticsearch/template/install';
import { getInstallation, getPackageInfo } from '../epm/packages';
import { updateDatastreamExperimentalFeatures } from '../epm/packages/update';
import {
  applyDocOnlyValueToMapping,
  forEachMappings,
} from '../experimental_datastream_features_helper';

export async function handleExperimentalDatastreamFeatureOptIn({
  soClient,
  esClient,
  packagePolicy,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicy: PackagePolicy | NewPackagePolicy;
}) {
  if (!packagePolicy.package?.experimental_data_stream_features) {
    return;
  }

  // If we're performing an update, we want to check if we actually need to perform
  // an update to the component templates for the package. So we fetch the saved object
  // for the package policy here to compare later.
  let installation;
  const templateMappings: { [key: string]: any } = {};

  if (packagePolicy.package) {
    installation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
    });

    const packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
      pkgVersion: packagePolicy.package.version,
    });

    // prepare template from package spec to find original index:false values
    const templates = packageInfo.data_streams?.map((dataStream: any) => {
      const experimentalDataStreamFeature =
        packagePolicy.package?.experimental_data_stream_features?.find(
          (datastreamFeature) =>
            datastreamFeature.data_stream === getRegistryDataStreamAssetBaseName(dataStream)
        );
      return prepareTemplate({ pkg: packageInfo, dataStream, experimentalDataStreamFeature });
    });

    templates?.forEach((template) => {
      Object.keys(template.componentTemplates).forEach((templateName) => {
        templateMappings[templateName] =
          (template.componentTemplates[templateName].template as any).mappings ?? {};
      });
    });
  }

  for (const featureMapEntry of packagePolicy.package.experimental_data_stream_features) {
    const existingOptIn = installation?.experimental_data_stream_features?.find(
      (optIn) => optIn.data_stream === featureMapEntry.data_stream
    );

    const hasFeatureChanged = (name: ExperimentalIndexingFeature) =>
      existingOptIn?.features[name] !== featureMapEntry.features[name];

    const isSyntheticSourceOptInChanged = hasFeatureChanged('synthetic_source');

    const isTSDBOptInChanged = hasFeatureChanged('tsdb');

    const isDocValueOnlyNumericChanged = hasFeatureChanged('doc_value_only_numeric');
    const isDocValueOnlyOtherChanged = hasFeatureChanged('doc_value_only_other');

    if (
      [
        isSyntheticSourceOptInChanged,
        isTSDBOptInChanged,
        isDocValueOnlyNumericChanged,
        isDocValueOnlyOtherChanged,
      ].every((hasFlagChange) => !hasFlagChange)
    )
      continue;

    const componentTemplateName = `${featureMapEntry.data_stream}@package`;
    const componentTemplateRes = await esClient.cluster.getComponentTemplate({
      name: componentTemplateName,
    });

    const componentTemplate = componentTemplateRes.component_templates[0].component_template;

    const mappings = componentTemplate.template.mappings;
    const componentTemplateChanged =
      isDocValueOnlyNumericChanged || isDocValueOnlyOtherChanged || isSyntheticSourceOptInChanged;

    let mappingsProperties = componentTemplate.template.mappings?.properties;
    if (isDocValueOnlyNumericChanged || isDocValueOnlyOtherChanged) {
      forEachMappings(mappings?.properties ?? {}, (mappingProp, name) =>
        applyDocOnlyValueToMapping(
          mappingProp,
          name,
          featureMapEntry,
          isDocValueOnlyNumericChanged,
          isDocValueOnlyOtherChanged
        )
      );

      const templateProperties = (templateMappings[componentTemplateName] ?? {}).properties ?? {};
      // merge package spec mappings with generated mappings, so that index:false from package spec is not overwritten
      mappingsProperties = merge(templateProperties, mappings?.properties ?? {});
    }

    let sourceModeSettings = {};

    if (isSyntheticSourceOptInChanged) {
      sourceModeSettings = {
        _source: {
          ...(featureMapEntry.features.synthetic_source ? { mode: 'synthetic' } : {}),
        },
      };
    }

    if (componentTemplateChanged) {
      const body = {
        template: {
          ...componentTemplate.template,
          mappings: {
            ...mappings,
            properties: mappingsProperties ?? {},
            ...sourceModeSettings,
          },
        },
      };

      await esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        body,
      });
    }

    if (isTSDBOptInChanged) {
      const indexTemplateRes = await esClient.indices.getIndexTemplate({
        name: featureMapEntry.data_stream,
      });
      const indexTemplate = indexTemplateRes.index_templates[0].index_template;

      const indexTemplateBody = {
        ...indexTemplate,
        template: {
          ...(indexTemplate.template ?? {}),
          settings: {
            ...(indexTemplate.template?.settings ?? {}),
            index: {
              mode: featureMapEntry.features.tsdb ? 'time_series' : null,
            },
          },
        },
      };

      await esClient.indices.putIndexTemplate({
        name: featureMapEntry.data_stream,
        // @ts-expect-error
        body: indexTemplateBody,
      });
    }
  }

  // Update the installation object to persist the experimental feature map
  await updateDatastreamExperimentalFeatures(
    soClient,
    packagePolicy.package.name,
    packagePolicy.package.experimental_data_stream_features
  );

  // Delete the experimental features map from the package policy so it doesn't get persisted
  delete packagePolicy.package.experimental_data_stream_features;
}
