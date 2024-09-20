/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const generateCustomLogsYml = ({
  datasetName = '',
  serviceName,
  namespace = '',
  customConfigurations,
  logFilePaths = [],
  apiKey,
  esHost,
  logfileId,
}: {
  datasetName?: string;
  serviceName?: string;
  namespace?: string;
  customConfigurations?: string;
  logFilePaths?: string[];
  apiKey: string;
  esHost: string[];
  logfileId: string;
}) => {
  const customConfigYaml = load(customConfigurations ?? '');
  const processors = [
    {
      add_fields: {
        target: 'service',
        fields: {
          name: serviceName,
        },
      },
    },
  ];

  return dump({
    ...{
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: esHost,
          api_key: apiKey,
        },
      },
      inputs: [
        {
          id: logfileId,
          type: 'logfile',
          data_stream: {
            namespace,
          },
          streams: [
            {
              id: `logs-onboarding-${datasetName}`,
              data_stream: {
                dataset: datasetName,
              },
              paths: logFilePaths,
              ...(serviceName ? { processors } : {}),
            },
          ],
        },
      ],
    },
    ...customConfigYaml,
  });
};
