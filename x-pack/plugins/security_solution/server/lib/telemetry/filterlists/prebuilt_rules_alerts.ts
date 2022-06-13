/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllowlistFields } from './types';

export const prebuiltRuleAllowlistFields: AllowlistFields = {
  _id: true,
  id: true,
  '@timestamp': true,
  // Base alert fields
  'kibana.alert.ancestors': true,
  'kibana.alert.depth': true,
  'kibana.alert.original_event.action': true,
  'kibana.alert.original_event.category': true,
  'kibana.alert.original_event.dataset': true,
  'kibana.alert.original_event.kind': true,
  'kibana.alert.original_event.module': true,
  'kibana.alert.original_event.type': true,
  'kibana.alert.original_time': true,
  'kibana.alert.risk_score': true,
  'kibana.alert.rule.actions': true,
  'kibana.alert.rule.category': true,
  'kibana.alert.rule.consumer': true,
  'kibana.alert.rule.created_at': true,
  'kibana.alert.rule.enabled': true,
  'kibana.alert.rule.exceptions_list': true,
  'kibana.alert.rule.execution.uuid': true,
  'kibana.alert.rule.false_positives': true,
  'kibana.alert.rule.from': true,
  'kibana.alert.rule.immutable': true,
  'kibana.alert.rule.interval': true,
  'kibana.alert.rule.name': true,
  'kibana.alert.rule.producer': true,
  'kibana.alert.rule.references': true,
  'kibana.alert.rule.risk_score_mapping': true,
  'kibana.alert.rule.rule_id': true,
  'kibana.alert.rule.rule_type_id': true,
  'kibana.alert.rule.severity': true,
  'kibana.alert.rule.severity_mapping': true,
  'kibana.alert.rule.tags': true,
  'kibana.alert.rule.threat': true,
  'kibana.alert.rule.timestamp_override': true,
  'kibana.alert.rule.type': true,
  'kibana.alert.rule.updated_at': true,
  'kibana.alert.rule.uuid': true,
  'kibana.alert.rule.version': true,
  'kibana.alert.severity': true,
  'kibana.alert.status': true,
  'kibana.alert.uuid': true,
  'kibana.alert.workflow_status': true,
  'kibana.space_ids': true,
  'kibana.version': true,
  // Event specific fileter entries
  'event.ingested': true,
  'event.provider': true,
  'event.created': true,
  'event.kind': true,
  'event.action': true,
  'event.id': true,
  'event.type': true,
  'event.category': true,
  'event.dataset': true,
  'event.outcome': true,
  'event.module': true,
  job_id: true,
  causes: true,
  typical: true,
  multi_bucket_impact: true,
  partition_field_name: true,
  partition_field_value: true,
  // Alert specific filter entries
  agent: {
    id: true,
  },
  destination: {
    port: true,
  },
  dll: {
    code_signature: {
      status: true,
      subject_name: true,
    },
  },
  dns: {
    question: {
      name: true,
    },
  },
  event: true,
  group: {
    name: true,
  },
  host: {
    os: true,
  },
  http: {
    request: {
      body: {
        content: true,
      },
      method: true,
    },
    response: {
      status_code: true,
    },
  },
  message: true,
  network: {
    bytes: true,
    direction: true,
    protocol: true,
    transport: true,
    type: true,
  },
  process: {
    args: true,
    args_count: true,
    code_signature: {
      subject_name: true,
      trusted: true,
    },
    command_line: true,
    entity_id: true,
    executable: true,
    Ext: {
      token: {
        integrity_level_name: true,
      },
    },
    name: true,
    parent: {
      args: true,
      commmand_line: true,
      entity_id: true,
      executable: true,
      Ext: {
        real: {
          pid: true,
        },
      },
      name: true,
      pid: true,
      original_file_name: true,
    },
    pid: true,
    working_directory: true,
  },
  registry: {
    data: {
      string: true,
    },
    path: true,
    value: true,
  },
  rule: {
    name: true,
  },
  source: {
    port: true,
  },
  tls: {
    server: {
      hash: true,
    },
  },
  type: true,
  url: {
    extension: true,
    full: true,
    path: true,
  },
  user_agent: {
    original: true,
  },
  user: {
    domain: true,
    id: true,
  },
  // aws rule fields
  aws: {
    cloudtrail: {
      console_login: {
        additional_eventdata: {
          mfa_used: true,
        },
      },
      error_code: true,
      user_identity: {
        session_context: {
          session_issuer: {
            type: true,
          },
        },
        type: true,
      },
    },
  },
  // azure fields
  azure: {
    activitylogs: {
      operation_name: true,
    },
    auditlogs: {
      operation_name: true,
      properties: {
        category: true,
        target_resources: true,
      },
    },
    signinlogs: {
      properties: {
        app_display_name: true,
        risk_level_aggregated: true,
        risk_level_during_signin: true,
        risk_state: true,
        token_issuer_type: true,
      },
    },
  },
  endgame: {
    event_subtype_full: true,
    metadata: {
      type: true,
    },
  },
  file: {
    Ext: {
      windows: {
        zone_identifier: true,
      },
    },
    extension: true,
    hash: true,
    name: true,
    path: true,
    pe: {
      imphash: true,
      original_file_name: true,
    },
  },
  // Google/GCP
  google_workspace: {
    admin: {
      new_value: true,
      setting: {
        name: true,
      },
    },
  },
  // office 360
  o365: {
    audit: {
      LogonError: true,
      ModifiedProperties: {
        /* eslint-disable @typescript-eslint/naming-convention */
        Role_DisplayName: {
          NewValue: true,
        },
      },
      Name: true,
      NewValue: true,
      Operation: true,
      Parameters: {
        AccessRights: true,
        AllowFederatedUsers: true,
        AllowGuestUser: true,
        Enabled: true,
        ForwardAsAttachmentTo: true,
        ForwardTo: true,
        RedirectTo: true,
      },
    },
  },
  powershell: {
    file: {
      script_block_text: true,
    },
  },
  // winlog
  winlog: {
    api: true,
    channel: true,
    event_data: true,
    event_id: true,
    keywords: true,
    logon: true,
    opcode: true,
    process: true,
    provider_guid: true,
    provider_name: true,
    record_id: true,
    task: true,
    user: {
      identifier: true,
      domain: true,
      type: true,
    },
    version: true,
  },
  // ml signal fields
  influencers: true,
  signal: {
    ancestors: true,
    depth: true,
    original_time: true,
    parent: true,
    parents: true,
    reason: true,
    rule: {
      anomaly_threshold: true,
      from: true,
      machine_learning_job_id: true,
      name: true,
      output_index: true,
    },
  },
};
