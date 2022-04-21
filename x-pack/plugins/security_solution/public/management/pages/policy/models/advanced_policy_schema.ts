/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    first_supported_version: '7.9',
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
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.base_url',
      {
        defaultMessage:
          'Base URL from which to download global artifact manifests. Default: https://artifacts.security.elastic.co.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'linux.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'linux.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'linux.advanced.logging.syslog',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.logging.syslog',
      {
        defaultMessage:
          'A supplied value will configure logging to syslog. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'mac.advanced.agent.connection_delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.base_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.base_url',
      {
        defaultMessage: 'URL from which to download global artifact manifests.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'mac.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'mac.advanced.logging.syslog',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.logging.syslog',
      {
        defaultMessage:
          'A supplied value will configure logging to syslog. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'mac.advanced.malware.quarantine',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.malware.threshold',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.malware.threshold',
      {
        defaultMessage:
          'The threshold that should be used for evaluating malware. Allowed values are normal, conservative, and aggressive. Default: normal.',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.connect',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.connect',
      {
        defaultMessage: 'Whether to connect to the kernel driver. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.process',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.process',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.filewrite',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.filewrite',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.harden.self_protect',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.harden.self_protect',
      {
        defaultMessage: 'Enables self-protection on macOS. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.agent.connection_delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.agent.connection_delay',
      {
        defaultMessage:
          'How long to wait for agent connectivity before sending first policy reply, in seconds. Default: 60.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.base_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.base_url',
      {
        defaultMessage: 'URL from which to download global artifact manifests.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.manifest_relative_url',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.manifest_relative_url',
      {
        defaultMessage:
          'Relative URL from which to download global artifact manifests. Default: /downloads/endpoint/manifest/artifacts-<version>.zip.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the global artifact manifest signature.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.global.interval',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.global.interval',
      {
        defaultMessage:
          'Interval between global artifact manifest download attempts, in seconds. Default: 3600.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.public_key',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.public_key',
      {
        defaultMessage:
          'PEM-encoded public key used to verify the user artifact manifest signature.',
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.delay',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.delay',
      {
        defaultMessage: 'Delay for sending events to Elasticsearch, in seconds. Default: 120.',
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_peer',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.verify_peer',
      {
        defaultMessage: 'Whether to verify the certificates presented by the peer. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.verify_hostname',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.verify_hostname',
      {
        defaultMessage:
          "Whether to verify the hostname of the peer is what's in the certificate. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.elasticsearch.tls.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.elasticsearch.tls.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Elasticsearch certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.logging.file',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.logging.file',
      {
        defaultMessage:
          'A supplied value will override the log level configured for logs that are saved to disk and streamed to Elasticsearch. It is recommended Fleet be used to change this logging in most circumstances. Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'windows.advanced.logging.debugview',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.logging.debugview',
      {
        defaultMessage:
          'A supplied value will configure logging to Debugview (a Sysinternals tool). Allowed values are error, warning, info, debug, and trace.',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.quarantine',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.malware.threshold',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.malware.threshold',
      {
        defaultMessage:
          'The threshold that should be used for evaluating malware. Allowed values are normal, conservative, and aggressive. Default: normal.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.connect',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.connect',
      {
        defaultMessage: 'Whether to connect to the kernel driver. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.process',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.process',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel process events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.filewrite',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.filewrite',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file write events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.network',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.network',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel network events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.fileopen',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.fileopen',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel file open events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.asyncimageload',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.asyncimageload',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel async image load events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.syncimageload',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.syncimageload',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel sync image load events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.registry',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.registry',
      {
        defaultMessage:
          "A value of 'false' overrides other config settings that would enable kernel registry events. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.fileaccess',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.fileaccess',
      {
        defaultMessage:
          'Report limited file access (read) events. Paths are not user-configurable. Default value is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.kernel.registryaccess',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.kernel.registryaccess',
      {
        defaultMessage:
          'Report limited registry access (queryvalue, savekey) events. Paths are not user-configurable. Default value is true.',
      }
    ),
  },
  {
    key: 'windows.advanced.diagnostic.enabled',
    first_supported_version: '7.11',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'linux.advanced.diagnostic.enabled',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.diagnostic.enabled',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.diagnostic.enabled',
      {
        defaultMessage:
          "A value of 'false' disables running diagnostic features on Endpoint. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.alerts.cloud_lookup',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.alerts.cloud_lookup',
      {
        defaultMessage:
          "A value of 'false' disables cloud lookup for Windows alerts. Default: true.",
      }
    ),
  },
  {
    key: 'mac.advanced.alerts.cloud_lookup',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.alerts.cloud_lookup',
      {
        defaultMessage: "A value of 'false' disables cloud lookup for Mac alerts. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.ransomware.mbr',
    first_supported_version: '7.12',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.ransomware.mbr',
      {
        defaultMessage: "A value of 'false' disables Ransomware MBR protection. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.ransomware.canary',
    first_supported_version: '7.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.ransomware.canary',
      {
        defaultMessage: "A value of 'false' disables Ransomware canary protection. Default: true.",
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode',
      {
        defaultMessage:
          'Enable shellcode injection detection as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.memory_scan',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.malware.quarantine',
    first_supported_version: '7.14',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.malware.quarantine',
      {
        defaultMessage:
          'Whether quarantine should be enabled when malware prevention is enabled. Default: true.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_collect_sample',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected shellcode regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_enhanced_pe_parsing',
    first_supported_version: '7.15',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.memory_protection.shellcode_enhanced_pe_parsing',
      {
        defaultMessage:
          'Attempt to identify and extract PE metadata from injected shellcode, including Authenticode signatures and version resource information. Default: true.',
      }
    ),
  },
  {
    key: 'mac.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'mac.advanced.memory_protection.memory_scan',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.memory_scan_collect_sample',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.memory_scan_collect_sample',
      {
        defaultMessage:
          'Collect 4MB of memory surrounding detected malicious memory regions. Default: false. Enabling this value may significantly increase the amount of data stored in Elasticsearch.',
      }
    ),
  },
  {
    key: 'linux.advanced.memory_protection.memory_scan',
    first_supported_version: '7.16',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.memory_protection.memory_scan',
      {
        defaultMessage:
          'Enable scanning for malicious memory regions as a part of memory protection. Default: true.',
      }
    ),
  },
  {
    key: 'linux.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'mac.advanced.artifacts.user.ca_cert',
    first_supported_version: '7.9',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.artifacts.user.ca_cert',
      {
        defaultMessage: 'PEM-encoded certificate for Fleet Server certificate authority.',
      }
    ),
  },
  {
    key: 'windows.advanced.events.etw',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.events.etw',
      {
        defaultMessage: 'Enable collection of ETW events. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.diagnostic.rollback_telemetry_enabled',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.diagnostic.rollback_telemetry_enabled',
      {
        defaultMessage: 'Enable diagnostic rollback telemetry. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network_extension.enable_content_filtering',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network_extension.enable_content_filtering',
      {
        defaultMessage:
          'Enable or disable the network content filter, this will enable/disable network eventing. Host isolation will fail if this option is disabled. Default: true',
      }
    ),
  },
  {
    key: 'mac.advanced.kernel.network_extension.enable_packet_filtering',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.mac.advanced.kernel.network_extension.enable_packet_filtering',
      {
        defaultMessage:
          'Enable or disable the network packet filter. Host isolation will fail if this option is disabled. Default: true',
      }
    ),
  },
  {
    key: 'windows.advanced.memory_protection.shellcode_trampoline_detection',
    first_supported_version: '8.1',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.windows.advanced.memory_protection.shellcode_trampoline_detection',
      {
        defaultMessage:
          'Enable trampoline-based shellcode injection detection as a part of memory protection. Default: true',
      }
    ),
  },
  {
    key: 'linux.advanced.kernel.capture_mode',
    first_supported_version: '8.2',
    documentation: i18n.translate(
      'xpack.securitySolution.endpoint.policy.advanced.linux.advanced.kernel.capture_mode',
      {
        defaultMessage:
          'Allows users to control whether kprobes or ebpf are used to gather data. Possible options are kprobes, ebpf, or auto. Default: kprobes',
      }
    ),
  },
];
