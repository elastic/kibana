/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, FullAgentConfigDatasource } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedDatasourceToAgentDatasource = (
  datasource: Datasource
): FullAgentConfigDatasource => {
  const { id, name, namespace, enabled, package: pkg, inputs } = datasource;

  const fullDatasource: FullAgentConfigDatasource = {
    id: id || name,
    name,
    namespace,
    enabled,
    use_output: DEFAULT_OUTPUT.name, // TODO: hardcoded to default output for now
    inputs: inputs
      .filter(input => input.enabled)
      .map(input => {
        const fullInput = {
          ...input,
          ...Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
            acc[key] = value;
            return acc;
          }, {} as { [k: string]: any }),
          streams: input.streams
            .filter(stream => stream.enabled)
            .map(stream => {
              const fullStream = {
                ...stream,
                ...stream.agent_stream,
                ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                  acc[key] = value;
                  return acc;
                }, {} as { [k: string]: any }),
              };
              delete fullStream.agent_stream;
              delete fullStream.vars;
              delete fullStream.config;
              return fullStream;
            }),
        };
        delete fullInput.vars;
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
