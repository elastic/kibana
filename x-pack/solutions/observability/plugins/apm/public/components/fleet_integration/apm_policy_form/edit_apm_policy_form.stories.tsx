/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { StoryFn, Meta } from '@storybook/react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { EditAPMPolicyForm } from './edit_apm_policy_form';
import type { NewPackagePolicy, PackagePolicy } from './typings';

const coreMock = {
  http: { get: async () => ({}) },
  notifications: { toasts: { add: () => {} } },
  uiSettings: { get: () => {} },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const stories: Meta<{}> = {
  title: 'fleet/Edit APM policy',
  component: EditAPMPolicyForm,
  decorators: [
    (StoryComponent) => {
      return (
        <div style={{ width: 700 }}>
          <KibanaReactContext.Provider>
            <StoryComponent />
          </KibanaReactContext.Provider>
        </div>
      );
    },
  ],
};
export default stories;

export const EditAPMPolicy: StoryFn = () => {
  const [newPolicy, setNewPolicy] = useState<NewPackagePolicy>(policy);
  const [isPolicyValid, setIsPolicyValid] = useState(true);

  return (
    <>
      <div
        style={{
          background: isPolicyValid ? '#00BFB3' : '#BD271E',
          height: 30,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <pre>
          <strong>{`Is Policy valid: ${isPolicyValid} (when false, "Save integration" button is disabled)`}</strong>
        </pre>
      </div>
      <EditAPMPolicyForm
        policy={{} as PackagePolicy}
        newPolicy={newPolicy}
        onChange={(value) => {
          if (value.isValid !== undefined) {
            setIsPolicyValid(value.isValid);
          }
          const updatedVars = value.updatedPolicy.inputs?.[0].vars;
          setNewPolicy((state) => ({
            ...state,
            inputs: [{ ...state.inputs[0], vars: updatedVars }],
          }));
        }}
      />
      <hr />
      <br />
      <pre>{JSON.stringify(newPolicy, null, 4)}</pre>
    </>
  );
};

const policy = {
  version: 'WzM2OTksMl0=',
  name: 'Elastic APM',
  namespace: 'default',
  enabled: true,
  policy_ids: ['policy-elastic-agent-on-cloud'],
  package: {
    name: 'apm',
    version: '8.3.0',
    title: 'Elastic APM',
  },
  elasticsearch: {
    privileges: {
      cluster: ['cluster:monitor/main'],
    },
  },
  inputs: [
    {
      type: 'apm',
      enabled: true,
      config: {
        'apm-server': {
          value: {
            rum: {
              source_mapping: {
                metadata: [],
              },
            },
            agent_config: [],
          },
        },
      },
      streams: [],
      vars: {
        host: {
          type: 'text',
          value: '0.0.0.0:8200',
        },
        url: {
          type: 'text',
          value: 'cloud_apm_url_test',
        },
        secret_token: {
          type: 'text',
          value: 'asdfkjhasdf',
        },
        api_key_enabled: {
          type: 'bool',
          value: true,
        },
        enable_rum: {
          type: 'bool',
          value: true,
        },
        anonymous_enabled: {
          type: 'bool',
          value: true,
        },
        anonymous_allow_agent: {
          type: 'text',
          value: ['rum-js', 'js-base', 'iOS/swift'],
        },
        anonymous_allow_service: {
          type: 'text',
          value: '',
        },
        anonymous_rate_limit_event_limit: {
          type: 'integer',
          value: 300,
        },
        anonymous_rate_limit_ip_limit: {
          type: 'integer',
          value: 1000,
        },
        default_service_environment: {
          type: 'text',
          value: '',
        },
        rum_allow_origins: {
          type: 'text',
          value: ['"*"'],
        },
        rum_allow_headers: {
          type: 'text',
          value: '',
        },
        rum_response_headers: {
          type: 'yaml',
          value: '',
        },
        rum_library_pattern: {
          type: 'text',
          value: '"node_modules|bower_components|~"',
        },
        rum_exclude_from_grouping: {
          type: 'text',
          value: '"^/webpack"',
        },
        api_key_limit: {
          type: 'integer',
          value: 100,
        },
        max_event_bytes: {
          type: 'integer',
          value: 307200,
        },
        capture_personal_data: {
          type: 'bool',
          value: true,
        },
        max_header_bytes: {
          type: 'integer',
          value: 1048576,
        },
        idle_timeout: {
          type: 'text',
          value: '45s',
        },
        read_timeout: {
          type: 'text',
          value: '3600s',
        },
        shutdown_timeout: {
          type: 'text',
          value: '30s',
        },
        write_timeout: {
          type: 'text',
          value: '30s',
        },
        max_connections: {
          type: 'integer',
          value: 0,
        },
        response_headers: {
          type: 'yaml',
          value: '',
        },
        expvar_enabled: {
          type: 'bool',
          value: false,
        },
        pprof_enabled: {
          type: 'bool',
          value: false,
        },
        tls_enabled: {
          type: 'bool',
          value: false,
        },
        tls_certificate: {
          type: 'text',
          value: '',
        },
        tls_key: {
          type: 'text',
          value: '',
        },
        tls_supported_protocols: {
          type: 'text',
          value: ['TLSv1.0', 'TLSv1.1', 'TLSv1.2'],
        },
        tls_cipher_suites: {
          type: 'text',
          value: '',
        },
        tls_curve_types: {
          type: 'text',
          value: '',
        },
        tail_sampling_policies: {
          type: 'yaml',
          value: '- sample_rate: 0.1\n',
        },
        tail_sampling_interval: {
          type: 'text',
          value: '1m',
        },
        tail_sampling_enabled: {
          type: 'bool',
          value: false,
        },
      },
    },
  ],
} as NewPackagePolicy;
