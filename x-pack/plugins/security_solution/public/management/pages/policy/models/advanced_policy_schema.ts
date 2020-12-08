/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

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
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation:
      'Base URL from which to download global artifact manifests. Default: https://artifacts.security.elastic.co.',
  },
  {
    key: 'linux.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation:
      'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
  },
  {
    key: 'linux.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the global artifact manifest signature.',
  },
  {
    key: 'linux.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'linux.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the user artifact manifest signature.',
  },
  {
    key: 'linux.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between user artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'linux.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: 'Delay for sending events to elasticsearch, in seconds. Default: 120.',
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'Whether to verify the certificates presented by the peer. Default: true.',
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation:
      "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
  },
  {
    key: 'linux.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: 'Text blob of a certificate authority.',
  },
  {
    key: 'mac.advanced.agent.connection_delay',
    first_supported_version: '7.11',
    documentation:
      'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
  },
  {
    key: 'mac.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation: 'URL from which to download global artifact manifests.',
  },
  {
    key: 'mac.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation:
      'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
  },
  {
    key: 'mac.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the global artifact manifest signature.',
  },
  {
    key: 'mac.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'mac.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the user artifact manifest signature.',
  },
  {
    key: 'mac.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between user artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'mac.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: 'Delay for sending events to elasticsearch, in seconds. Default: 120.',
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'Whether to verify the certificates presented by the peer. Default: true.',
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation:
      "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
  },
  {
    key: 'mac.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: 'Text blob of a certificate authority.',
  },
  {
    key: 'mac.advanced.malware.quarantine',
    first_supported_version: '7.11',
    documentation:
      'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
  },
  {
    key: 'mac.advanced.kernel.connect',
    first_supported_version: '7.11',
    documentation: 'Whether to connect to the kernel driver. Default: true.',
  },
  {
    key: 'mac.advanced.kernel.process',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
  },
  {
    key: 'mac.advanced.kernel.filewrite',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
  },
  {
    key: 'mac.advanced.kernel.network',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
  },
  {
    key: 'windows.advanced.agent.connection_delay',
    first_supported_version: '7.11',
    documentation:
      'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
  },
  {
    key: 'windows.advanced.artifacts.global.base_url',
    first_supported_version: '7.11',
    documentation: 'URL from which to download global artifact manifests.',
  },
  {
    key: 'windows.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.11',
    documentation:
      'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
  },
  {
    key: 'windows.advanced.artifacts.global.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the global artifact manifest signature.',
  },
  {
    key: 'windows.advanced.artifacts.global.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'windows.advanced.artifacts.user.public_key',
    first_supported_version: '7.11',
    documentation: 'Public key used to verify the user artifact manifest signature.',
  },
  {
    key: 'windows.advanced.artifacts.user.interval',
    first_supported_version: '7.11',
    documentation:
      'Interval between user artifact manifest download attempts, in seconds. Default: 3600.',
  },
  {
    key: 'windows.advanced.elasticsearch.delay',
    first_supported_version: '7.11',
    documentation: 'Delay for sending events to elasticsearch, in seconds. Default: 120.',
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.11',
    documentation: 'Whether to verify the certificates presented by the peer. Default: true.',
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.11',
    documentation:
      "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
  },
  {
    key: 'windows.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.11',
    documentation: 'Text blob of a certificate authority.',
  },
  {
    key: 'windows.advanced.malware.quarantine',
    first_supported_version: '7.11',
    documentation:
      'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
  },
  {
    key: 'windows.advanced.ransomware.mbr',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable ransomware MBR. Default: true.",
  },
  {
    key: 'windows.advanced.ransomware.canary',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable ransomware canary. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.connect',
    first_supported_version: '7.11',
    documentation: 'Whether to connect to the kernel driver. Default: true.',
  },
  {
    key: 'windows.advanced.kernel.process',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.filewrite',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.network',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.fileopen',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel file open events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.asyncimageload',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel async image load events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.syncimageload',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel sync image load events. Default: true.",
  },
  {
    key: 'windows.advanced.kernel.registry',
    first_supported_version: '7.11',
    documentation:
      "A value of 'false' overrides other config settings that would enable kernel registry events. Default: true.",
  },
];
