/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { useState } from 'react';
import { RuntimeAttachment } from '.';
import { JavaRuntimeAttachment } from './supported_agents/java_runtime_attachment';

const stories: Meta<{}> = {
  title: 'fleet/Runtime agent attachment',
  component: RuntimeAttachment,
  decorators: [
    (StoryComponent) => {
      return (
        <div style={{ width: 700 }}>
          <StoryComponent />
        </div>
      );
    },
  ],
};
export default stories;

const excludeOptions = [
  { value: 'main', label: 'main class / jar name' },
  { value: 'vmarg', label: 'vmarg' },
  { value: 'user', label: 'user' },
];
const includeOptions = [{ value: 'all', label: 'All' }, ...excludeOptions];

const versions = ['1.27.1', '1.27.0', '1.26.0', '1.25.0'];

export const RuntimeAttachmentExample: Story = () => {
  const [runtimeAttachmentSettings, setRuntimeAttachmentSettings] = useState(
    {}
  );
  return (
    <>
      <RuntimeAttachment
        operationTypes={[
          {
            operation: { value: 'include', label: 'Include' },
            types: includeOptions,
          },
          {
            operation: { value: 'exclude', label: 'Exclude' },
            types: excludeOptions,
          },
        ]}
        onChange={(settings: any) => {
          setRuntimeAttachmentSettings(settings);
        }}
        toggleDescription="Attach the Java agent to running and starting Java applications."
        discoveryRulesDescription="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs"
        showUnsavedWarning={true}
        initialIsEnabled={true}
        initialDiscoveryRules={[
          {
            operation: 'include',
            type: 'main',
            probe: 'java-opbeans-10010',
          },
          {
            operation: 'exclude',
            type: 'vmarg',
            probe: '10948653898867',
          },
        ]}
        versions={versions}
        selectedVersion={versions[0]}
      />
      <hr />
      <pre>{JSON.stringify(runtimeAttachmentSettings, null, 4)}</pre>
    </>
  );
};

export const JavaRuntimeAttachmentExample: Story = () => {
  return (
    <JavaRuntimeAttachment
      policy={policy}
      newPolicy={newPolicy}
      onChange={() => {}}
    />
  );
};

const policy = {
  id: 'cc380ec5-d84e-40e1-885a-d706edbdc968',
  version: 'WzM0MzA2LDJd',
  name: 'apm-1',
  description: '',
  namespace: 'default',
  policy_id: 'policy-elastic-agent-on-cloud',
  enabled: true,
  output_id: '',
  inputs: [
    {
      type: 'apm',
      policy_template: 'apmserver',
      enabled: true,
      streams: [],
      vars: {
        host: {
          value: 'localhost:8200',
          type: 'text',
        },
        url: {
          value: 'http://localhost:8200',
          type: 'text',
        },
        secret_token: {
          type: 'text',
        },
        api_key_enabled: {
          value: false,
          type: 'bool',
        },
        enable_rum: {
          value: true,
          type: 'bool',
        },
        anonymous_enabled: {
          value: true,
          type: 'bool',
        },
        anonymous_allow_agent: {
          value: ['rum-js', 'js-base', 'iOS/swift'],
          type: 'text',
        },
        anonymous_allow_service: {
          value: [],
          type: 'text',
        },
        anonymous_rate_limit_event_limit: {
          value: 10,
          type: 'integer',
        },
        anonymous_rate_limit_ip_limit: {
          value: 10000,
          type: 'integer',
        },
        default_service_environment: {
          type: 'text',
        },
        rum_allow_origins: {
          value: ['"*"'],
          type: 'text',
        },
        rum_allow_headers: {
          value: [],
          type: 'text',
        },
        rum_response_headers: {
          type: 'yaml',
        },
        rum_library_pattern: {
          value: '"node_modules|bower_components|~"',
          type: 'text',
        },
        rum_exclude_from_grouping: {
          value: '"^/webpack"',
          type: 'text',
        },
        api_key_limit: {
          value: 100,
          type: 'integer',
        },
        max_event_bytes: {
          value: 307200,
          type: 'integer',
        },
        capture_personal_data: {
          value: true,
          type: 'bool',
        },
        max_header_bytes: {
          value: 1048576,
          type: 'integer',
        },
        idle_timeout: {
          value: '45s',
          type: 'text',
        },
        read_timeout: {
          value: '3600s',
          type: 'text',
        },
        shutdown_timeout: {
          value: '30s',
          type: 'text',
        },
        write_timeout: {
          value: '30s',
          type: 'text',
        },
        max_connections: {
          value: 0,
          type: 'integer',
        },
        response_headers: {
          type: 'yaml',
        },
        expvar_enabled: {
          value: false,
          type: 'bool',
        },
        tls_enabled: {
          value: false,
          type: 'bool',
        },
        tls_certificate: {
          type: 'text',
        },
        tls_key: {
          type: 'text',
        },
        tls_supported_protocols: {
          value: ['TLSv1.0', 'TLSv1.1', 'TLSv1.2'],
          type: 'text',
        },
        tls_cipher_suites: {
          value: [],
          type: 'text',
        },
        tls_curve_types: {
          value: [],
          type: 'text',
        },
        tail_sampling_policies: {
          type: 'yaml',
        },
        tail_sampling_interval: {
          type: 'text',
        },
      },
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
      compiled_input: {
        'apm-server': {
          auth: {
            anonymous: {
              allow_agent: ['rum-js', 'js-base', 'iOS/swift'],
              allow_service: null,
              enabled: true,
              rate_limit: {
                event_limit: 10,
                ip_limit: 10000,
              },
            },
            api_key: {
              enabled: false,
              limit: 100,
            },
            secret_token: null,
          },
          capture_personal_data: true,
          idle_timeout: '45s',
          default_service_environment: null,
          'expvar.enabled': false,
          host: 'localhost:8200',
          max_connections: 0,
          max_event_size: 307200,
          max_header_size: 1048576,
          read_timeout: '3600s',
          response_headers: null,
          rum: {
            allow_headers: null,
            allow_origins: ['*'],
            enabled: true,
            exclude_from_grouping: '^/webpack',
            library_pattern: 'node_modules|bower_components|~',
            response_headers: null,
          },
          shutdown_timeout: '30s',
          write_timeout: '30s',
        },
      },
    },
  ],
  package: {
    name: 'apm',
    title: 'Elastic APM',
    version: '7.16.0',
  },
  elasticsearch: {
    privileges: {
      cluster: ['cluster:monitor/main'],
    },
  },
  revision: 1,
  created_at: '2021-11-18T02:14:55.758Z',
  created_by: 'admin',
  updated_at: '2021-11-18T02:14:55.758Z',
  updated_by: 'admin',
};

const newPolicy = {
  version: 'WzM0MzA2LDJd',
  name: 'apm-1',
  description: '',
  namespace: 'default',
  policy_id: 'policy-elastic-agent-on-cloud',
  enabled: true,
  output_id: '',
  package: {
    name: 'apm',
    title: 'Elastic APM',
    version: '8.0.0-dev2',
  },
  elasticsearch: {
    privileges: {
      cluster: ['cluster:monitor/main'],
    },
  },
  inputs: [
    {
      type: 'apm',
      policy_template: 'apmserver',
      enabled: true,
      vars: {
        host: {
          value: 'localhost:8200',
          type: 'text',
        },
        url: {
          value: 'http://localhost:8200',
          type: 'text',
        },
        secret_token: {
          type: 'text',
        },
        api_key_enabled: {
          value: false,
          type: 'bool',
        },
        enable_rum: {
          value: true,
          type: 'bool',
        },
        anonymous_enabled: {
          value: true,
          type: 'bool',
        },
        anonymous_allow_agent: {
          value: ['rum-js', 'js-base', 'iOS/swift'],
          type: 'text',
        },
        anonymous_allow_service: {
          value: [],
          type: 'text',
        },
        anonymous_rate_limit_event_limit: {
          value: 10,
          type: 'integer',
        },
        anonymous_rate_limit_ip_limit: {
          value: 10000,
          type: 'integer',
        },
        default_service_environment: {
          type: 'text',
        },
        rum_allow_origins: {
          value: ['"*"'],
          type: 'text',
        },
        rum_allow_headers: {
          value: [],
          type: 'text',
        },
        rum_response_headers: {
          type: 'yaml',
        },
        rum_library_pattern: {
          value: '"node_modules|bower_components|~"',
          type: 'text',
        },
        rum_exclude_from_grouping: {
          value: '"^/webpack"',
          type: 'text',
        },
        api_key_limit: {
          value: 100,
          type: 'integer',
        },
        max_event_bytes: {
          value: 307200,
          type: 'integer',
        },
        capture_personal_data: {
          value: true,
          type: 'bool',
        },
        max_header_bytes: {
          value: 1048576,
          type: 'integer',
        },
        idle_timeout: {
          value: '45s',
          type: 'text',
        },
        read_timeout: {
          value: '3600s',
          type: 'text',
        },
        shutdown_timeout: {
          value: '30s',
          type: 'text',
        },
        write_timeout: {
          value: '30s',
          type: 'text',
        },
        max_connections: {
          value: 0,
          type: 'integer',
        },
        response_headers: {
          type: 'yaml',
        },
        expvar_enabled: {
          value: false,
          type: 'bool',
        },
        tls_enabled: {
          value: false,
          type: 'bool',
        },
        tls_certificate: {
          type: 'text',
        },
        tls_key: {
          type: 'text',
        },
        tls_supported_protocols: {
          value: ['TLSv1.0', 'TLSv1.1', 'TLSv1.2'],
          type: 'text',
        },
        tls_cipher_suites: {
          value: [],
          type: 'text',
        },
        tls_curve_types: {
          value: [],
          type: 'text',
        },
        tail_sampling_policies: {
          type: 'yaml',
        },
        tail_sampling_interval: {
          type: 'text',
        },
      },
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
    },
  ],
};
