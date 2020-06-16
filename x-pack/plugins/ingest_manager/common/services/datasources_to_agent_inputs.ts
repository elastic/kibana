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
        dataset: {
          namespace: datasource.namespace || 'default',
          type: input.type,
        },
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

// export const storedDatasourcesToAgentInputs = (datasource: Datasource): FullAgentConfigInput => {
//   const { id, name, namespace, enabled, package: pkg, inputs } = datasource;

//   const fullStreams: FullAgentConfigInputStream[] = [];

//   inputs.forEach((input) => {
//     if (!input.enabled || !input.streams || !input.streams.length) {
//       return;
//     }
//     const streams: FullAgentConfigInputStream[] = input.streams
//       .filter((stream) => stream.enabled)
//       .map((stream) => {
//         const fullStream: FullAgentConfigInputStream = {
//           id: stream.id,
//           processors: stream.processors,
//           'dataset.type': stream.dataset,
//           ...stream.agent_stream,
//           ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
//             acc[key] = value;
//             return acc;
//           }, {} as { [k: string]: any }),
//         };
//         return fullStream;
//       });
//     fullStreams.concat(streams);
//   });

//   const fullInput: FullAgentConfigInput = {
//     id: id || name,
//     name,
//     'dataset.namespace': namespace,
//     use_output: DEFAULT_OUTPUT.name, // TODO: hardcoded to default output for now
//     streams: inputs
//       .filter((input) => input.enabled)
//       .map((input) => {
//         const fullInput = {
//           ...input,
//           ...Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
//             acc[key] = value;
//             return acc;
//           }, {} as { [k: string]: any }),
//           streams: input.streams
//             .filter((stream) => stream.enabled)
//             .map((stream) => {
//               const fullStream = {
//                 ...stream,
//                 ...stream.agent_stream,
//                 ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
//                   acc[key] = value;
//                   return acc;
//                 }, {} as { [k: string]: any }),
//               };
//               delete fullStream.agent_stream;
//               delete fullStream.vars;
//               delete fullStream.config;
//               return fullStream;
//             }),
//         };
//         delete fullInput.vars;
//         delete fullInput.config;
//         return fullInput;
//       }),
//   };

//   if (pkg) {
//     fullInput.package = {
//       name: pkg.name,
//       version: pkg.version,
//     };
//   }

//   return fullInput;
// };
