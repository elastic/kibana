/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { safeLoad } from 'js-yaml';
import {
  Datasource,
  NewDatasource,
  DatasourceConfigRecord,
  DatasourceConfigRecordEntry,
  FullAgentConfigDatasource,
} from '../types';
import { DEFAULT_OUTPUT } from '../constants';

const configReducer = (
  configResult: DatasourceConfigRecord,
  configEntry: [string, DatasourceConfigRecordEntry]
): DatasourceConfigRecord => {
  const [configName, { type: configType, value: configValue }] = configEntry;
  if (configValue !== undefined && configValue !== '') {
    if (configType === 'yaml') {
      try {
        const yamlValue = safeLoad(configValue);
        if (yamlValue) {
          configResult[configName] = yamlValue;
        }
      } catch (e) {
        // Silently swallow parsing error
      }
    } else {
      configResult[configName] = configValue;
    }
  }
  return configResult;
};

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
      .map(input => {
        const fullInput = {
          ...input,
          ...Object.entries(input.config || {}).reduce(configReducer, {}),
          streams: input.streams.map(stream => {
            const fullStream = {
              ...stream,
              ...Object.entries(stream.config || {}).reduce(configReducer, {}),
            };
            delete fullStream.config;
            return fullStream;
          }),
        };
        delete fullInput.config;
        return fullInput;
      }),
  };

  if (pkg) {
    fullDatasource.package = {
      name: pkg.name,
      version: pkg.version,
    };
  }

  return fullDatasource;
};
