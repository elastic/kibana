/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import yaml from 'js-yaml';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { monaco } from '@kbn/monaco';

const { Uri, editor } = monaco;

const SCHEMA_URI = 'http://elastic.co/cloud_defend.yaml';
const modelUri = Uri.parse(SCHEMA_URI);

export const useConfigModel = (configuration: string) => {
  const json = useMemo(() => {
    try {
      return yaml.load(configuration);
    } catch {
      return { selectors: [] };
    }
  }, [configuration]);

  return useMemo(() => {
    const selectorNames = json?.selectors?.map((selector: any) => selector.name) || [];

    setDiagnosticsOptions({
      validate: true,
      completion: true,
      hover: true,
      schemas: [
        {
          uri: SCHEMA_URI,
          fileMatch: [String(modelUri)],
          schema: {
            type: 'object',
            required: ['selectors', 'responses'],
            additionalProperties: false,
            properties: {
              selectors: {
                type: 'array',
                minItems: 1,
                items: { $ref: '#/$defs/selector' },
              },
              responses: {
                type: 'array',
                minItems: 1,
                items: { $ref: '#/$defs/response' },
              },
            },
            $defs: {
              selector: {
                type: 'object',
                required: ['name'],
                additionalProperties: false,
                anyOf: [
                  { required: ['operation'] },
                  { required: ['containerImageName'] },
                  { required: ['containerImageTag'] },
                  { required: ['targetFilePath'] },
                  { required: ['orchestratorClusterId'] },
                  { required: ['orchestratorClusterName'] },
                  { required: ['orchestratorNamespace'] },
                  { required: ['orchestratorResourceLabel'] },
                  { required: ['orchestratorResourceName'] },
                  { required: ['orchestratorType'] },
                ],
                properties: {
                  name: {
                    type: 'string',
                  },
                  operation: {
                    type: 'array',
                    minItems: 1,
                    items: { enum: ['createExecutable', 'modifyExecutable', 'execMemFd'] },
                  },
                  containerImageName: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  containerImageTag: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  targetFilePath: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorClusterId: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorClusterName: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorNamespace: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorResourceLabel: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorResourceName: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                  },
                  orchestratorType: {
                    type: 'array',
                    minItems: 1,
                    items: { enum: ['kubernetes'] },
                  },
                },
              },
              response: {
                type: 'object',
                required: ['match', 'actions'],
                additionalProperties: false,
                properties: {
                  match: { type: 'array', minItems: 1, items: { enum: selectorNames } },
                  exclude: { type: 'array', items: { enum: selectorNames } },
                  actions: { type: 'array', minItems: 1, items: { enum: ['alert', 'block'] } },
                },
              },
            },
          },
        },
      ],
    });

    let model = editor.getModel(modelUri);

    if (model === null) {
      model = editor.createModel(configuration, 'yaml', modelUri);
    }

    return model;
  }, [configuration, json.selectors]);
};
