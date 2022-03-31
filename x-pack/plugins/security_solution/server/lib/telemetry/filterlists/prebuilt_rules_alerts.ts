/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllowlistFields } from './types';

export const prebuiltRuleAllowlistFields: AllowlistFields = {
  _id: true,
  '@timestamp': true,
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
  group: {
    name: true,
  },
  host: {
    id: true,
    os: {
      family: true,
      name: true,
    },
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
  // Base alert fields
  kibana: {
    alert: {
      ancestors: true,
      depth: true,
      original_time: true,
      reason: true,
      risk_score: true,
      rule: {
        enabled: true,
        from: true,
        interval: true,
        max_signals: true,
        name: true,
        rule_id: true,
        tags: true,
        type: true,
        uuid: true,
        version: true,
        severity: true,
        workflow_status: true,
      },
    },
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
  event: {
    action: true,
    agent_id_status: true,
    category: true,
    code: true,
    dataset: true,
    kind: true,
    module: true,
    outcome: true,
    provider: true,
    type: true,
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
    event_data: {
      AccessList: true,
      AccessMask: true,
      AllowedToDelegateTo: true,
      AttributeLDAPDisplayName: true,
      AttributeValue: true,
      CallerProcessName: true,
      CallTrace: true,
      ClientProcessId: true,
      GrantedAccess: true,
      IntegrityLevel: true,
      NewTargetUserName: true,
      ObjectDN: true,
      OldTargetUserName: true,
      ParentProcessId: true,
      PrivilegeList: true,
      Properties: true,
      RelativeTargetName: true,
      ShareName: true,
      SubjectLogonId: true,
      SubjectUserName: true,
      TargetImage: true,
      TargetLogonId: true,
      TargetProcessGUID: true,
      TargetSid: true,
    },
    logon: {
      type: true,
    },
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
