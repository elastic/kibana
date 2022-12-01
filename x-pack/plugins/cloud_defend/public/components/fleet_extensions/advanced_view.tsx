/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { CodeEditor, YamlLang } from '@kbn/kibana-react-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { monaco } from '@kbn/monaco';
import yaml from 'js-yaml';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { useStyles } from './styles';

const { Uri, editor } = monaco;

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

interface AdvancedViewDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

interface ConfigError {
  line: number;
  message: string;
}

const ALERTS_DATASET = 'cloud_defend.alerts';
const SCHEMA_URI = 'http://elastic.co/cloud_defend.yaml';

const modelUri = Uri.parse(SCHEMA_URI);

function getStreamByDataset(policy: NewPackagePolicy, name: string) {
  return policy.inputs[0].streams.find((stream) => stream.data_stream.dataset === name);
}

export const AdvancedView = ({ policy, onChange }: AdvancedViewDeps) => {
  const styles = useStyles();
  const [errors, setErrors] = useState<ConfigError[]>([]);
  const stream = getStreamByDataset(policy, ALERTS_DATASET);
  const configuration = stream?.vars?.configuration?.value || '';

  const currentModel = useMemo(() => {
    try {
      const json = yaml.load(configuration);

      const selectorNames = json.selectors.map((selector: any) => selector.name);

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
              properties: {
                selectors: { type: 'array', items: { $ref: '#/$defs/selector' } },
                responses: {
                  type: 'array',
                  minItems: 1,
                  items: { $ref: '#/$defs/response' },
                },
              },
              $defs: {
                selector: {
                  type: 'object',
                  required: ['name', 'activity'],
                  properties: {
                    name: {
                      type: 'string',
                    },
                    activity: {
                      type: 'array',
                      minItems: 1,
                      items: { enum: ['createExecutable', 'modifyExecutable'] },
                    },
                    file: {
                      type: 'object',
                      properties: {
                        path: {
                          type: 'array',
                          minItems: 1,
                          items: { type: 'string' },
                        },
                        name: {
                          type: 'array',
                          minItems: 1,
                          items: { type: 'string' },
                        },
                      },
                    },
                    orchestrator: {
                      type: 'object',
                      properties: {
                        cluster: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'array',
                              minItems: 1,
                              items: { type: 'string' },
                            },
                            name: {
                              type: 'array',
                              minItems: 1,
                              items: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                    memfd: {
                      type: 'boolean',
                    },
                  },
                },
                response: {
                  type: 'object',
                  required: ['match', 'actions'],
                  properties: {
                    match: { type: 'array', minItems: 1, items: { enum: selectorNames } },
                    exclude: { type: 'array', items: { enum: selectorNames } },
                    actions: { type: 'array', items: { enum: ['alert', 'block'] } },
                  },
                },
              },
            },
          },
        ],
      });
    } catch (err) {
      console.log(err);
    }

    let model = editor.getModel(modelUri);

    if (model === null) {
      model = editor.createModel(configuration, 'yaml', modelUri);
    }

    return model;
  }, [configuration]);

  useEffect(() => {
    const listener = editor.onDidChangeMarkers(([resource]) => {
      const markers = editor.getModelMarkers({ resource });
      const errs = markers.map((marker) => {
        const error: ConfigError = {
          line: marker.startLineNumber,
          message: marker.message,
        };

        return error;
      });

      onChange({ isValid: errs.length === 0, updatedPolicy: policy });
      setErrors(errs);
    });

    return () => {
      listener.dispose();
    };
  }, [onChange, policy]);

  const onYamlChange = useCallback(
    (value) => {
      if (stream?.vars) {
        stream.vars.configuration.value = value;
        onChange({ isValid: errors.length === 0, updatedPolicy: policy });
      }
    },
    [errors.length, onChange, policy, stream?.vars]
  );

  return (
    <>
      <div css={styles.yamlEditor}>
        <CodeEditor
          languageId={YamlLang}
          options={{
            wordWrap: 'off',
            model: currentModel,
          }}
          onChange={onYamlChange}
          value={configuration}
        />
      </div>
    </>
  );
};
