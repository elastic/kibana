/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingProperty,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { ExperimentalIndexingFeature } from '../../../common/types';
import type { NewPackagePolicy, PackagePolicy } from '../../types';
import { getInstallation } from '../epm/packages';
import { updateDatastreamExperimentalFeatures } from '../epm/packages/update';

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

  if (packagePolicy.package) {
    installation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
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

    const forEachMappings = (
      mappingProperties: Record<PropertyName, MappingProperty>,
      process: Function
    ) => {
      Object.keys(mappingProperties).forEach((mapping) => {
        const property = mappingProperties[mapping] as any;
        if (property.properties) {
          forEachMappings(property.properties, process);
        } else {
          process(property);
        }
      });
    };

    // TODO update mappings in getBaseTemplate (template.ts) too
    if (isDocValueOnlyNumericChanged || isDocValueOnlyOtherChanged) {
      forEachMappings(mappings?.properties ?? {}, (mappingProp: MappingProperty) => {
        const mapping = mappingProp as any;

        // TODO is there a built in way to do check if numeric type?
        const numericTypes = [
          'long',
          'integer',
          'short',
          'byte',
          'double',
          'float',
          'half_float',
          'scaled_float',
          'unsigned_long',
        ];
        if (isDocValueOnlyNumericChanged && numericTypes.includes(mapping.type ?? '')) {
          // TODO check for package spec value
          if (
            featureMapEntry.features.doc_value_only_numeric === false &&
            mapping.index === false
          ) {
            delete mapping.index;
          }
          if (featureMapEntry.features.doc_value_only_numeric && !mapping.index) {
            mapping.index = false;
          }
        }

        // is this all or only wildcard not supported?
        const otherSupportedTypes = ['date', 'boolean', 'ip', 'geo_point', 'keyword']; // date_nanos
        if (isDocValueOnlyOtherChanged && otherSupportedTypes.includes(mapping.type ?? '')) {
          // TODO check for package spec value
          if (featureMapEntry.features.doc_value_only_other === false && mapping.index === false) {
            delete mapping.index;
          }
          if (featureMapEntry.features.doc_value_only_other && !mapping.index) {
            mapping.index = false;
          }
        }
      });
    }

    // console.log(JSON.stringify(mappings, null, 2))

    let sourceModeSettings = {};

    if (isSyntheticSourceOptInChanged) {
      sourceModeSettings = {
        _source: {
          mode: featureMapEntry.features.synthetic_source ? 'synthetic' : 'stored',
        },
      };
    }

    if (componentTemplateChanged) {
      const body = {
        template: {
          ...componentTemplate.template,
          mappings: {
            ...mappings,
            ...sourceModeSettings,
          },
        },
      };

      await esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        body,
      });
    }

    if (isTSDBOptInChanged && featureMapEntry.features.tsdb) {
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
              mode: 'time_series',
            },
          },
        },
      };

      await esClient.indices.putIndexTemplate({
        name: featureMapEntry.data_stream,
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
