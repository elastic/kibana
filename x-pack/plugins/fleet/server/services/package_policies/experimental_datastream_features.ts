/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { NewPackagePolicy, PackagePolicy } from '../../types';
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

  for (const featureMapEntry of packagePolicy.package.experimental_data_stream_features) {
    const componentTemplateName = `${featureMapEntry.data_stream}@package`;
    const componentTemplateRes = await esClient.cluster.getComponentTemplate({
      name: componentTemplateName,
    });

    const componentTemplate = componentTemplateRes.component_templates[0].component_template;

    const body = {
      template: {
        ...componentTemplate.template,
        mappings: {
          ...componentTemplate.template.mappings,
          _source: {
            mode: featureMapEntry.features.synthetic_source ? 'synthetic' : 'stored',
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

  // Update the installation object to persist the experimental feature map
  await updateDatastreamExperimentalFeatures(
    soClient,
    packagePolicy.package.name,
    packagePolicy.package.experimental_data_stream_features
  );

  // Delete the experimental features map from the package policy so it doesn't get persisted
  delete packagePolicy.package.experimental_data_stream_features;
}
