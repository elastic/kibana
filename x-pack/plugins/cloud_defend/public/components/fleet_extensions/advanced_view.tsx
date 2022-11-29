/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { CodeEditor, CodeEditorProps } from '@kbn/kibana-react-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { useStyles } from './styles';

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

interface AdvancedViewDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

const ALERTS_DATASET = 'cloud_defend.alerts';
const SCHEMA = {
  $id: 'https://elastic.co/cloud_defend.schema.json',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  description: 'Configuration yaml for the cloud_defend integration',
  type: 'object',
  properties: {
    process_context_matchers: {
      type: 'array',
      items: { $ref: '#/$defs/matcher' },
    },
    matchers_response_bindings: {
      type: 'array',
      items: { $ref: '#/$defs/bindings' },
    },
    responses: {
      type: 'array',
      items: { $ref: '#/$defs/responses' },
    },
  },
  $defs: {
    matcher: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
        },
        orchestrators: {
          type: 'array',
          items: { type: 'string' },
        },
        containers_only: {
          type: 'boolean',
        },
        k8s_pod_labels: {
          type: 'array',
          items: { type: 'string' },
        },
        k8s_namespaces: {
          type: 'array',
          items: { type: 'string' },
        },
        container_images: {
          type: 'array',
          items: { type: 'string' },
        },
        excluded_container_images: {
          type: 'array',
          items: { type: 'string' },
        },
        memfd: {
          type: 'boolean',
        },
        paths: {
          type: 'array',
          items: { type: 'string' },
        },
        excluded_paths: {
          type: 'array',
          items: { type: 'string' },
        },
        action: {
          type: 'string',
        },
      },
    },
    binding: {
      type: 'object',
      required: ['match', 'response'],
      properties: {
        match: {
          type: 'array',
          items: { $ref: '#/$defs/matcher' },
        },
        response: {
          $ref: '#/$defs/response',
        },
      },
    },
    response: {
      type: 'object',
      required: ['name', 'response'],
      properties: {
        record: {
          type: 'array',
          items: { enum: ['alert'] },
        },
        response: { enum: ['allow', 'block'] },
      },
    },
  },
};

const commonEditorProps: CodeEditorProps = {
  languageId: 'yaml',
  value: '',
  options: {
    wordWrap: 'off',
  },
};

function getStreamByDataset(policy: NewPackagePolicy, name: string) {
  return policy.inputs[0].streams.find((stream) => stream.data_stream.dataset === name);
}

export const AdvancedView = ({ policy, onChange }: AdvancedViewDeps) => {
  const styles = useStyles();
  const stream = getStreamByDataset(policy, ALERTS_DATASET);
  const processContextMatchers = stream?.vars?.process_context_matchers?.value || '';
  const matchersReponseBindings = stream?.vars?.matchers_response_bindings?.value || '';
  const responses = stream?.vars?.responses?.value || '';

  const onChangeMatchers = useCallback(
    (value) => {
      if (stream?.vars) {
        stream.vars.process_context_matchers.value = value;
        onChange({ isValid: true, updatedPolicy: policy });
      }
    },
    [onChange, policy, stream?.vars]
  );
  const onChangeBindings = useCallback(
    (value) => {
      if (stream?.vars) {
        stream.vars.matchers_response_bindings.value = value;
        onChange({ isValid: true, updatedPolicy: policy });
      }
    },
    [onChange, policy, stream?.vars]
  );
  const onChangeResponses = useCallback(
    (value) => {
      if (stream?.vars) {
        stream.vars.responses.value = value;
        onChange({ isValid: true, updatedPolicy: policy });
      }
    },
    [onChange, policy, stream?.vars]
  );

  return (
    <>
      <div css={styles.yamlEditor}>
        <CodeEditor
          {...commonEditorProps}
          onChange={onChangeMatchers}
          value={processContextMatchers}
        />
      </div>
      <div css={styles.yamlEditor}>
        <CodeEditor
          {...commonEditorProps}
          onChange={onChangeBindings}
          value={matchersReponseBindings}
        />
      </div>
      <div css={styles.yamlEditor}>
        <CodeEditor {...commonEditorProps} onChange={onChangeResponses} value={responses} />
      </div>
    </>
  );
};
