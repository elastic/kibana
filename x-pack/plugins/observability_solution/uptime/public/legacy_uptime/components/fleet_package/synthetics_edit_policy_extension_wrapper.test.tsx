/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { SyntheticsPolicyEditExtensionWrapper } from './synthetics_policy_edit_extension_wrapper';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
}));

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

const defaultNewPolicy: NewPackagePolicy = {
  name: 'samplePolicyName',
  description: '',
  namespace: 'default',
  policy_id: 'ae774160-8e49-11eb-aba5-99269d21ba6e',
  enabled: true,
  inputs: [
    {
      type: 'synthetics/http',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'http',
          },
          vars: {
            __ui: {
              value: JSON.stringify({ is_tls_enabled: true }),
              type: 'yaml',
            },
            type: {
              value: 'http',
              type: 'text',
            },
            name: {
              value: 'Sample name',
              type: 'text',
            },
            schedule: {
              value: '"@every 3m"',
              type: 'text',
            },
            urls: {
              value: '',
              type: 'text',
            },
            'service.name': {
              value: '',
              type: 'text',
            },
            timeout: {
              value: '16s',
              type: 'text',
            },
            max_redirects: {
              value: 0,
              type: 'integer',
            },
            proxy_url: {
              value: '',
              type: 'text',
            },
            tags: {
              value: '[]',
              type: 'yaml',
            },
            'response.include_headers': {
              value: true,
              type: 'bool',
            },
            'response.include_body': {
              value: 'on_error',
              type: 'text',
            },
            'check.request.method': {
              value: 'GET',
              type: 'text',
            },
            'check.request.headers': {
              value: '{}',
              type: 'yaml',
            },
            'check.request.body': {
              value: '""',
              type: 'yaml',
            },
            'check.response.status': {
              value: '[]',
              type: 'yaml',
            },
            'check.response.headers': {
              value: '{}',
              type: 'yaml',
            },
            'check.response.body.positive': {
              value: '[]',
              type: 'yaml',
            },
            'check.response.body.negative': {
              value: '[]',
              type: 'yaml',
            },
            'ssl.certificate_authorities': {
              value: '',
              type: 'yaml',
            },
            'ssl.certificate': {
              value: '',
              type: 'yaml',
            },
            'ssl.key': {
              value: '',
              type: 'yaml',
            },
            'ssl.key_passphrase': {
              type: 'text',
            },
            'ssl.verification_mode': {
              value: 'full',
              type: 'text',
            },
          },
        },
      ],
    },
    {
      type: 'synthetics/tcp',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'tcp',
          },
          vars: {
            type: {
              value: 'tcp',
              type: 'text',
            },
            name: {
              type: 'text',
            },
            schedule: {
              value: '"@every 5s"',
              type: 'text',
            },
            hosts: {
              type: 'text',
            },
            'service.name': {
              type: 'text',
            },
            timeout: {
              type: 'text',
            },
            max_redirects: {
              type: 'integer',
            },
            proxy_url: {
              type: 'text',
            },
            proxy_use_local_resolver: {
              value: false,
              type: 'bool',
            },
            tags: {
              type: 'yaml',
            },
            'check.send': {
              type: 'text',
            },
            'check.receive': {
              value: '',
              type: 'yaml',
            },
            'ssl.certificate_authorities': {
              type: 'yaml',
            },
            'ssl.certificate': {
              type: 'yaml',
            },
            'ssl.key': {
              type: 'yaml',
            },
            'ssl.key_passphrase': {
              type: 'text',
            },
            'ssl.verification_mode': {
              type: 'text',
            },
          },
        },
      ],
    },
    {
      type: 'synthetics/icmp',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'icmp',
          },
          vars: {
            type: {
              value: 'icmp',
              type: 'text',
            },
            name: {
              type: 'text',
            },
            schedule: {
              value: '"@every 5s"',
              type: 'text',
            },
            wait: {
              value: '1s',
              type: 'text',
            },
            hosts: {
              type: 'text',
            },
            'service.name': {
              type: 'text',
            },
            timeout: {
              type: 'text',
            },
            max_redirects: {
              type: 'integer',
            },
            tags: {
              type: 'yaml',
            },
          },
        },
      ],
    },
    {
      type: 'synthetics/browser',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'browser',
          },
          vars: {
            type: {
              value: 'browser',
              type: 'text',
            },
            name: {
              value: 'Sample name',
              type: 'text',
            },
            schedule: {
              value: '"@every 5s"',
              type: 'text',
            },
            'source.zip_url.url': {
              type: 'text',
            },
            'source.zip_url.username': {
              type: 'text',
            },
            'source.zip_url.password': {
              type: 'password',
            },
            'source.zip_url.folder': {
              type: 'text',
            },
            'source.inline.script': {
              type: 'yaml',
            },
            timeout: {
              type: 'text',
            },
            tags: {
              type: 'yaml',
            },
          },
        },
      ],
    },
  ],
  package: {
    name: 'synthetics',
    title: 'Elastic Synthetics',
    version: '0.66.0',
  },
};

const defaultCurrentPolicy: any = {
  ...defaultNewPolicy,
  id: '',
  revision: '',
  updated_at: '',
  updated_by: '',
  created_at: '',
  created_by: '',
};

describe('<SyntheticsPolicyEditExtension />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ policy = defaultCurrentPolicy, newPolicy = defaultNewPolicy }) => {
    return (
      <SyntheticsPolicyEditExtensionWrapper
        policy={policy}
        newPolicy={newPolicy}
        onChange={onChange}
      />
    );
  };

  it('shows deprecation notice', async () => {
    const { getByText } = render(<WrappedComponent />);

    expect(
      getByText('Synthetic Monitoring is now available out of the box in Synthetics')
    ).toBeInTheDocument();
  });
});
