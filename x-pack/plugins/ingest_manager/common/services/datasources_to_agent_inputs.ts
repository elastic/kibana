/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, FullAgentConfigInput, FullAgentConfigInputStream } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedDatasourcesToAgentInputs = (
  datasources: Datasource[]
): FullAgentConfigInput[] => {
  const fullInputs: FullAgentConfigInput[] = [];

  datasources.forEach((datasource) => {
    if (!datasource.enabled || !datasource.inputs || !datasource.inputs.length) {
      return;
    }
    datasource.inputs.forEach((input) => {
      if (!input.enabled) {
        return;
      }

      const fullInput: FullAgentConfigInput = {
        id: datasource.id || datasource.name,
        name: datasource.name,
        type: input.type,
        dataset: { namespace: datasource.namespace || 'default' },
        use_output: DEFAULT_OUTPUT.name,
        ...Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
          acc[key] = value;
          return acc;
        }, {} as { [k: string]: any }),
        streams: input.streams
          .filter((stream) => stream.enabled)
          .map((stream) => {
            const fullStream: FullAgentConfigInputStream = {
              id: stream.id,
              dataset: { name: stream.dataset },
              ...stream.agent_stream,
              ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                acc[key] = value;
                return acc;
              }, {} as { [k: string]: any }),
            };
            if (stream.processors) {
              fullStream.processors = stream.processors;
            }
            return fullStream;
          }),
      };

      if (datasource.package) {
        fullInput.package = {
          name: datasource.package.name,
          version: datasource.package.version,
        };
      }

      fullInputs.push(fullInput);
    });
  });

  return fullInputs;
};
