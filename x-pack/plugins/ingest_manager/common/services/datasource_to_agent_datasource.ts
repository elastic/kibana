/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { safeLoad } from 'js-yaml';
import { Datasource, NewDatasource, FullAgentConfigDatasource } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedDatasourceToAgentDatasource = (
  datasource: Datasource | NewDatasource
): FullAgentConfigDatasource => {
  const { name, namespace, enabled, package: pkg, inputs } = datasource;
  const fullDatasource: FullAgentConfigDatasource = {
    id: name,
    namespace,
    enabled,
    use_output: DEFAULT_OUTPUT.name, // TODO: hardcoded to default output for now
    inputs: inputs
      .filter(input => input.enabled)
      .map(input => ({
        ...input,
        streams: input.streams.map(stream => {
          if (stream.config) {
            const fullStream = {
              ...stream,
              ...Object.entries(stream.config).reduce(
                (acc, [configName, { type: configType, value: configValue }]) => {
                  if (configValue !== undefined) {
                    if (configType === 'yaml') {
                      acc[configName] = safeLoad(configValue);
                    } else {
                      acc[configName] = configValue;
                    }
                  }
                  return acc;
                },
                {} as { [key: string]: any }
              ),
            };
            delete fullStream.config;
            return fullStream;
          } else {
            const fullStream = { ...stream };
            return fullStream;
          }
        }),
      })),
  };

  if (pkg) {
    fullDatasource.package = {
      name: pkg.name,
      version: pkg.version,
    };
  }

  return fullDatasource;
};
