/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TELEMETRY_MAX_BUFFER_SIZE = 100;

export const MAX_SECURITY_LIST_TELEMETRY_BATCH = 100;

export const MAX_ENDPOINT_TELEMETRY_BATCH = 300;

export const MAX_DETECTION_RULE_TELEMETRY_BATCH = 1_000;

export const MAX_DETECTION_ALERTS_BATCH = 50;

export const TELEMETRY_CHANNEL_LISTS = 'security-lists-v2';

export const TELEMETRY_CHANNEL_ENDPOINT_META = 'endpoint-metadata';

export const TELEMETRY_CHANNEL_DETECTION_ALERTS = 'alerts-detections';

export const TELEMETRY_CHANNEL_TIMELINE = 'alerts-timeline';

export const LIST_DETECTION_RULE_EXCEPTION = 'detection_rule_exception';

export const LIST_ENDPOINT_EXCEPTION = 'endpoint_exception';

export const LIST_ENDPOINT_EVENT_FILTER = 'endpoint_event_filter';

export const LIST_TRUSTED_APPLICATION = 'trusted_application';

export const INSIGHTS_CHANNEL = 'security-insights-v1';

export const DEFAULT_ADVANCED_POLICY_CONFIG_SETTINGS = {
  linux: {
    advanced: {
      agent: {
        connection_delay: 60
      },
      artifacts: {
        global: {
          base_url: '',
          manifest_relative_url: '',
          public_key: '',
          interval: 300
        },
        user: {
          public_key: '',
          ca_cert: ''
        }
      },
      elasticsearch: {
        delay: 600,
        tls: {
          verify_peer: true,
          verify_hostname: true,
          ca_cert: ''
        }
      },
      logging: {
        file: 'info',
        syslog: 'off'
      },
      diagnostic: {
        enabled: true
      },
      malware: {
        quarantine: true
      },
      memory_protection: {
        memory_scan_collect_sample: false,
        memory_scan: true
      },
      kernel: {
        capture_mode: 'auto'
      },
      event_filter: {
        default: true
      },
      utilization_limits: {
        cpu: 50
      }
    }
  },
  mac: {
    advanced: {
      agent: {
        connection_delay: 60
      },
      artifacts: {
        global: {
          base_url: '',
          manifest_relative_url: '',
          public_key: '',
          interval: 300
        },
        user: {
          public_key: '',
          ca_cert: ''
        }
      },
      elasticsearch: {
        delay: 600,
        tls: {
          verify_peer: true,
          verify_hostname: true,
          ca_cert: ''
        }
      },
      logging: {
        file: 'info',
        syslog: 'off'
      },
      malware: {
        quarantine: true,
        threshold: 'normal'
      },
      kernel: {
        connect: true,
        process: true,
        filewrite: true,
        network: true,
        network_extension: {
          enable_content_filtering: true,
          enable_packet_filtering: true
        }
      },
      harden: {
        self_protect: true
      },
      diagnostic: {
        enabled: true
      },
      alerts: {
        cloud_lookup: true
      },
      memory_protection: {
        memory_scan_collect_sample: false,
        memory_scan: true
      },
      event_filter: {
        default: true
      }
    }
  },
  windows: {
    advanced: {
      agent: {
        connection_delay: 60
      },
      artifacts: {
        global: {
          base_url: '',
          manifest_relative_url: '',
          public_key: '',
          interval: 300
        },
        user: {
          public_key: '',
          ca_cert: ''
        }
      },
      elasticsearch: {
        delay: 600,
        tls: {
          verify_peer: true,
          verify_hostname: true,
          ca_cert: ''
        }
      },
      logging: {
        file: 'info',
        debugview: 'off'
      },
      malware: {
        quarantine: true,
        threshold: 'normal'
      },
      kernel: {
        connect: true,
        process: true,
        filewrite: true,
        network: true,
        fileopen: true,
        asyncimageload: true,
        syncimageload: true,
        registry: true,
        fileaccess: true,
        registryaccess: true
      },
      diagnostic: {
        enabled: true,
        rollback_telemetry_enabled: true
      },
      alerts: {
        cloud_lookup: true
      },
      ransomware: {
        mbr: true,
        canary: true
      },
      memory_protection: {
        shellcode: true,
        memory_scan: true,
        shellcode_collect_sample: false,
        memory_scan_collect_sample: false,
        shellcode_enhanced_pe_parsing: true,
        shellcode_trampoline_detection: true
      },
      events: {
        etw: '' // ! Can't find default
      },
      event_filter: {
        default: true
      },
      utilization_limits: {
        cpu: 50
      },
      rollback: '' // ! Can't find default
    }
  }
};

