/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface AdvancedPolicySchemaType {
  key: string;
  first_supported_version: string;
  last_supported_version?: string;
  documentation: string;
}

export const AdvancedPolicySchema: AdvancedPolicySchemaType[] = [
  {
    key: 'linux.advanced.agent.connection_delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.user.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'linux.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.agent.connection_delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.user.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'mac.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.malware.quarantine',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.kernel.connect',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.kernel.harden',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.kernel.process',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.kernel.filewrite',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'mac.advanced.kernel.network',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.agent.connection_delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.global.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.user.base_url',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation: 'default is true',
  },
  {
    key: 'windows.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.malware.quarantine',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.ransomware.mbr',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.ransomware.canary',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.connect',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.harden',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.process',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.filewrite',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.network',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.fileopen',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.asyncimageload',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.syncimageload',
    first_supported_version: '7.11',
    documentation: '',
  },
  {
    key: 'windows.advanced.kernel.registry',
    first_supported_version: '7.11',
    documentation: '',
  },
];
