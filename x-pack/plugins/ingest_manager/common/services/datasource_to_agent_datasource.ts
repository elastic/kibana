/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, NewDatasource, FullAgentConfigDatasource } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedDatasourceToAgentDatasource = (
  datasource: Datasource | NewDatasource
): FullAgentConfigDatasource => {
  const { name, namespace, enabled, package: pkg, inputs } = datasource;

  const fullDatasource: FullAgentConfigDatasource = {
    id: 'id' in datasource ? datasource.id : name,
    name,
    namespace,
    enabled,
    use_output: DEFAULT_OUTPUT.name, // TODO: hardcoded to default output for now
    inputs: inputs
      .filter(input => input.enabled)
      .map(input => {
        const fullInput = {
          ...input,
          streams: input.streams
            .filter(stream => stream.enabled)
            .map(stream => {
              const fullStream = {
                ...stream,
                ...stream.pkg_stream,
              };
              delete fullStream.pkg_stream;
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
