/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import componentTemplateProfilingIlm from './component-template-profiling-ilm.json';
import componentTemplateProfilingEvents from './component-template-profiling-events.json';
import componentTemplateProfilingExecutables from './component-template-profiling-executables.json';
import componentTemplateProfilingStackframes from './component-template-profiling-stackframes.json';
import componentTemplateProfilingStacktraces from './component-template-profiling-stacktraces.json';

export enum ProfilingComponentTemplateName {
  Ilm = 'profiling-ilm',
  Events = 'profiling-events',
  Executables = 'profiling-executables',
  Stackframes = 'profiling-stackframes',
  Stacktraces = 'profiling-stacktraces',
}

export function getComponentTemplatesStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();

  return {
    name: 'component_templates',
    hasCompleted: async () => {
      return Promise.all(
        [
          ProfilingComponentTemplateName.Ilm,
          ProfilingComponentTemplateName.Events,
          ProfilingComponentTemplateName.Executables,
          ProfilingComponentTemplateName.Stackframes,
          ProfilingComponentTemplateName.Stacktraces,
        ].map((componentTemplateName) =>
          esClient.cluster.getComponentTemplate({
            name: componentTemplateName,
          })
        )
      ).then(
        () => Promise.resolve(true),
        (error) => {
          logger.debug('Some component templates could not be fetched');
          logger.debug(error);
          return Promise.resolve(false);
        }
      );
    },
    init: async () => {
      await Promise.all([
        esClient.cluster.putComponentTemplate({
          name: ProfilingComponentTemplateName.Ilm,
          create: false,
          template: componentTemplateProfilingIlm,
        }),
        esClient.cluster.putComponentTemplate({
          name: ProfilingComponentTemplateName.Events,
          create: false,
          template: componentTemplateProfilingEvents as IndicesIndexState,
          _meta: {
            description: 'Mappings for profiling events data stream',
          },
        }),
        esClient.cluster.putComponentTemplate({
          name: ProfilingComponentTemplateName.Executables,
          create: false,
          template: componentTemplateProfilingExecutables as IndicesIndexState,
        }),
        esClient.cluster.putComponentTemplate({
          name: ProfilingComponentTemplateName.Stackframes,
          create: false,
          template: componentTemplateProfilingStackframes as IndicesIndexState,
        }),
        esClient.cluster.putComponentTemplate({
          name: ProfilingComponentTemplateName.Stacktraces,
          create: false,
          template: componentTemplateProfilingStacktraces as IndicesIndexState,
        }),
      ]);
    },
  };
}
