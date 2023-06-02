/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { ProfilingComponentTemplateName } from './get_component_templates_step';

enum ProfilingIndexTemplate {
  Events = 'profiling-events',
  Executables = 'profiling-executables',
  Stacktraces = 'profiling-stacktraces',
  Stackframes = 'profiling-stackframes',
}

export function getIndexTemplatesStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();

  return {
    name: 'index_templates',
    hasCompleted: async () => {
      return Promise.all(
        [
          ProfilingIndexTemplate.Events,
          ProfilingIndexTemplate.Executables,
          ProfilingIndexTemplate.Stacktraces,
          ProfilingIndexTemplate.Stackframes,
        ].map((indexTemplateName) =>
          esClient.indices.getIndexTemplate({
            name: indexTemplateName,
          })
        )
      ).then(
        () => Promise.resolve(true),
        (error) => {
          logger.debug('Some index templates could not be fetched');
          logger.debug(error);
          return Promise.resolve(false);
        }
      );
    },
    init: async () => {
      await Promise.all([
        esClient.indices.putIndexTemplate({
          name: ProfilingIndexTemplate.Events,
          create: false,
          index_patterns: [ProfilingIndexTemplate.Events + '*'],
          data_stream: {
            hidden: false,
          },
          composed_of: [ProfilingComponentTemplateName.Events, ProfilingComponentTemplateName.Ilm],
          priority: 100,
          _meta: {
            description: `Index template for ${ProfilingIndexTemplate.Events}`,
          },
        }),
        ...[
          ProfilingIndexTemplate.Executables,
          ProfilingIndexTemplate.Stacktraces,
          ProfilingIndexTemplate.Stackframes,
        ].map((indexTemplateName) => {
          return esClient.indices.putIndexTemplate({
            name: indexTemplateName,
            // Don't fail if the index template already exists, simply overwrite the format
            create: false,
            index_patterns: [indexTemplateName + '*'],
            composed_of: [indexTemplateName],
            _meta: {
              description: `Index template for ${indexTemplateName}`,
            },
          });
        }),
      ]);
    },
  };
}
