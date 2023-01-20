/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

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

    const isSyntheticSourceOptInChanged =
      existingOptIn?.features.synthetic_source !== featureMapEntry.features.synthetic_source;

    const isTSDBOptInChanged = existingOptIn?.features.tsdb !== featureMapEntry.features.tsdb;

    if (!isSyntheticSourceOptInChanged && !isTSDBOptInChanged) continue;

    const componentTemplateName = `${featureMapEntry.data_stream}@package`;
    const componentTemplateRes = await esClient.cluster.getComponentTemplate({
      name: componentTemplateName,
    });

    const componentTemplate = componentTemplateRes.component_templates[0].component_template;

    if (isSyntheticSourceOptInChanged) {
      const body = {
        template: {
          ...componentTemplate.template,
          mappings: {
            ...componentTemplate.template.mappings,
            _source: {
              ...(featureMapEntry.features.synthetic_source ? { mode: 'synthetic' } : {}),
            },
          },
        },
      };

      await esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        // @ts-expect-error - TODO: Remove when ES client typings include support for synthetic source
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
