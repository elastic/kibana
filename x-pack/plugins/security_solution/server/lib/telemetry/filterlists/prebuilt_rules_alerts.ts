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
  package_version: true,
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
  'powershell.file.script_block_text': true,
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
  cloud: {
    availability_zone: true,
    provider: true,
    region: true,
  },
  cloud_defend: true,
  container: {
    id: true,
    image: {
      name: true,
      tag: true,
      hash: true,
    },
  },
  destination: true,
  dll: {
    Ext: {
      relative_file_creation_time: true,
      relative_file_name_modify_time: true,
    },
    code_signature: {
      exists: true,
      status: true,
      subject_name: true,
      trusted: true,
    },
    name: true,
    path: true,
    pe: {
      original_file_name: true,
      imphash: true,
    },
    hash: {
      sha256: true,
    },
  },
  dns: true,
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
  network: true,
  orchestrator: {
    namespace: true,
    resource: {
      parent: {
        type: true,
      },
      type: true,
    },
  },
  process: {
    args: true,
    args_count: true,
    code_signature: {
      exists: true,
      status: true,
      subject_name: true,
      trusted: true,
    },
    command_line: true,
    end: true,
    entity_id: true,
    entry_leader: true,
    executable: true,
    exit_code: true,
    Ext: {
      api: {
        name: true,
        parameters: {
          desired_access: true,
          desired_access_numeric: true,
        },
      },
      effective_parent: {
        executable: true,
        name: true,
      },
      relative_file_creation_time: true,
      token: {
        integrity_level_name: true,
      },
    },
    group: true,
    interactive: true,
    name: true,
    parent: {
      args: true,
      command_line: true,
      code_signature: {
        subject_name: true,
        status: true,
        exists: true,
        trusted: true,
      },
      entity_id: true,
      executable: true,
      Ext: {
        real: {
          pid: true,
        },
      },
      name: true,
      pid: true,
      pe: {
        original_file_name: true,
      },
    },
    pid: true,
    pe: {
      original_file_name: true,
    },
    session_leader: true,
    start: true,
    user: true,
    tty: true,
    working_directory: true,
  },
  registry: {
    data: {
      strings: true,
    },
    path: true,
    value: true,
  },
  rule: {
    name: true,
  },
  source: true,
  threat: {
    enrichments: {
      indicator: {
        confidence: true,
        description: true,
        email: {
          address: true,
        },
        first_seen: true,
        ip: true,
        last_seen: true,
        marking: {
          tlp: true,
          tlp_version: true,
        },
        modified_at: true,
        name: true,
        port: true,
        provider: true,
        reference: true,
        scanner_stats: true,
        sightings: true,
        type: true,
        matched: {
          atomic: true,
          field: true,
          id: true,
          index: true,
          occurred: true,
          type: true,
        },
      },
    },
    feed: {
      description: true,
      name: true,
      reference: true,
    },
    framework: true,
    group: {
      alias: true,
      id: true,
      name: true,
      reference: true,
    },
  },
  tls: {
    server: {
      hash: true,
    },
  },
  type: true,
  url: true,
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
    properties: {
      category: true,
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
    directory: true,
    Ext: {
      entropy: true,
      header_bytes: true,
      original: {
        name: true,
      },
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
  github: {
    org: true,
    team: true,
    repo: true,
    category: true,
    permission: true,
    repository_public: true,
  },
  // Google/GCP
  google_workspace: {
    actor: {
      type: true,
    },
    etag: true,
    event: {
      name: true,
      type: true,
    },
    id: {
      application_name: true,
      customer: {
        id: true,
      },
      time: true,
      unique_qualifier: true,
    },
    kind: true,
    organization: {
      domain: true,
    },
    admin: {
      application: {
        edition: true,
        enabled: true,
        licences_order_number: true,
        licences_purchased: true,
        id: true,
        asp_id: true,
        package_id: true,
      },
      group: {
        priorities: true,
        allowed_list: true,
      },
      new_value: true,
      old_value: true,
      org_unit: {
        name: true,
        full: true,
      },
      setting: {
        name: true,
        description: true,
      },
      user_defined_setting: {
        name: true,
      },
      domain: {
        alias: true,
        name: true,
        secondary_name: true,
      },
      managed_configuration: true,
      non_featured_services_selection: true,
      field: true,
      resource: {
        id: true,
      },
      gateway: {
        name: true,
      },
      chrome_os: {
        session_type: true,
      },
      device: {
        type: true,
        command_details: true,
      },
      print_server: {
        name: true,
      },
      printer: {
        name: true,
      },
      role: {
        id: true,
        name: true,
      },
      privilege: {
        name: true,
      },
      service: {
        name: true,
      },
      url: {
        name: true,
      },
      product: {
        name: true,
        sku: true,
      },
      bulk_upload: {
        failed: true,
        total: true,
      },
      email: {
        quarantine_name: true,
        log_search_filter: {
          message_id: true,
          start_date: true,
          end_date: true,
        },
      },
      oauth2: {
        service: {
          name: true,
        },
        application: {
          id: true,
          name: true,
          type: true,
        },
      },
      verification_method: true,
      alert: {
        name: true,
      },
      rule: {
        name: true,
      },
      api: {
        client: {
          name: true,
        },
        scopes: true,
      },
      mdm: {
        token: true,
        vendor: true,
      },
      info_type: true,
      email_monitor: {
        level: {
          incoming: true,
          outgoing: true,
        },
      },
      email_dump: {
        include_deleted: true,
        package_content: true,
        query: true,
      },
      request: {
        id: true,
      },
    },
    alert: {
      create_time: true,
      customer: {
        id: true,
      },
      data: {
        action: {
          name: true,
        },
        alert_details: true,
        appeal_window: true,
        attachment: {
          data: {
            csv: {
              data_rows: {
                entries: true,
              },
            },
          },
        },
        create_time: true,
        description: true,
        display: {
          name: true,
        },
        domain: true,
        domain_id: {
          customer_primary_domain: true,
        },
        events: {
          device_compromised_state: true,
          device: {
            property: true,
            model: true,
            type: true,
          },
          new_value: true,
          old_value: true,
          resource: {
            id: true,
          },
        },
        event_time: true,
        header: true,
        is_internal: true,
        malicious_entity: {
          display_name: true,
          entity: {
            display_name: true,
          },
          from_header: true,
        },
        messages: {
          attachments_sha256_hash: true,
          date: true,
          id: true,
          message_body_snippet: true,
          md5: {
            hash: {
              message_body: true,
              subject: true,
            },
          },
          subject_text: true,
        },
        name: true,
        next_update_time: true,
        primary: {
          admin: {
            changed_event: {
              domain: true,
            },
          },
        },
        products: true,
        query: true,
        resolution_time: true,
        rule: {
          violation_info: {
            data: {
              source: true,
            },
            match_info: {
              predefined_detector: {
                name: true,
              },
              user_defined_detector: {
                display: {
                  name: true,
                },
                resource: {
                  name: true,
                },
              },
            },
            resource_info: {
              document: {
                id: true,
              },
              resource: {
                title: true,
              },
            },
            rule_info: {
              display: {
                name: true,
              },
              resource: {
                name: true,
              },
            },
            trigger: {
              value: true,
            },
          },
        },
        rule_description: true,
        state: true,
        status: true,
        system_action_type: true,
        title: true,
        trigger: {
          source: true,
        },
        type: true,
        update_time: true,
      },
      deleted: true,
      end_time: true,
      etag: true,
      source: true,
      start_time: true,
      type: true,
      update_time: true,
    },
    context_aware_access: {
      access_level: {
        applied: true,
        satisfied: true,
        unsatisfied: true,
      },
      application: true,
      device: {
        state: true,
      },
    },
    device: {
      account_state: true,
      action: {
        execution_status: true,
        type: true,
      },
      apk_sha256_hash: true,
      application: {
        message: true,
        report: {
          key: true,
          severity: true,
          timestamp: true,
        },
        state: true,
      },
      basic_integrity: true,
      compliance: true,
      compromised_state: true,
      cts_profile_match: true,
      deactivation_reason: true,
      failed_passwd_attempts: true,
      id: true,
      model: true,
      new_device_id: true,
      new_value: true,
      old_value: true,
      os: {
        edition: true,
        property: true,
        version: true,
      },
      ownership: true,
      policy: {
        name: true,
        sync: {
          result: true,
          type: true,
        },
      },
      property: true,
      register_privilege: true,
      resource: {
        id: true,
      },
      risk_signal: true,
      security: {
        event_id: true,
        patch_level: true,
      },
      setting: true,
      status_on_apple_portal: true,
      type: true,
      value: true,
      windows_syncml_policy_status_code: true,
    },
    drive: {
      source_folder_id: true,
      source_folder_title: true,
      destination_folder_id: true,
      destination_folder_title: true,
      file: {
        id: true,
        type: true,
        owner: {
          is_shared_drive: true,
        },
      },
      originating_app_id: true,
      primary_event: true,
      shared_drive_id: true,
      visibility: true,
      new_value: true,
      old_value: true,
      sheets_import_range_recipient_doc: true,
      old_visibility: true,
      visibility_change: true,
      target_domain: true,
      added_role: true,
      membership_change_type: true,
      shared_drive_settings_change_type: true,
      removed_role: true,
      target: true,
    },
    login: {
      challenge_method: true,
      failure_type: true,
      challenge_status: true,
      timestamp: true,
      type: true,
      is_second_factor: true,
      is_suspicious: true,
    },
    rules: {
      actions: true,
      application: true,
      conference_id: true,
      data_source: true,
      device: {
        type: true,
      },
      drive_shared_drive_id: true,
      evaluation_context: true,
      has_alert: true,
      has_content_match: true,
      id: true,
      matched: {
        detectors: true,
        templates: true,
        threshold: true,
        trigger: true,
      },
      mobile_device_type: true,
      mobile_ios_vendor_id: true,
      name: true,
      resource_name: true,
      resource: {
        id: true,
        name: true,
        recipients_omitted_count: true,
        title: true,
        type: true,
      },
      scan_type: true,
      severity: true,
      space: {
        id: true,
        type: true,
      },
      suppressed_actions: true,
      triggered_actions: true,
      type: true,
      update_time_usec: true,
    },
    saml: {
      application_name: true,
      failure_type: true,
      initiated_by: true,
      orgunit_path: true,
      status_code: true,
      second_level_status_code: true,
    },
    token: {
      api_name: true,
      app_name: true,
      client: {
        type: true,
      },
      method_name: true,
      num_response_bytes: true,
      scope: {
        data: true,
        value: true,
      },
    },
  },
  // kubernetes
  kubernetes: {
    audit: {
      annotations: true,
      verb: true,
      user: {
        groups: true,
      },
      impersonatedUser: {
        groups: true,
      },
      objectRef: {
        name: true,
        namespace: true,
        resource: true,
        subresource: true,
      },
      requestObject: {
        spec: {
          containers: {
            image: true,
            securityContext: {
              allowPrivilegeEscalation: true,
              capabilities: {
                add: true,
              },
              privileged: true,
              procMount: true,
              runAsGroup: true,
              runAsUser: true,
            },
          },
          hostIPC: true,
          hostNetwork: true,
          hostPID: true,
          securityContext: {
            runAsGroup: true,
            runAsUser: true,
          },
          serviceAccountName: true,
          type: true,
          volumes: {
            hostPath: {
              path: true,
            },
          },
        },
      },
      requestURI: true,
      responseObject: {
        roleRef: {
          kind: true,
          resourceName: true,
        },
        rules: true,
        spec: {
          containers: {
            securityContext: {
              allowPrivilegeEscalation: true,
            },
          },
        },
      },
      responseStatus: {
        code: true,
      },
      userAgent: true,
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
        ModifiedProperties: {
          Role_DisplayName: {
            NewValue: true,
          },
        },
        RedirectTo: true,
      },
    },
  },
  // okta
  okta: {
    actor: {
      alternate_id: true,
      id: true,
      type: true,
    },
    client: {
      device: true,
      id: true,
      user_agent: {
        raw_user_agent: true,
      },
      zone: true,
    },
    device: {
      device_integrator: true,
      disk_encryption_type: true,
      id: true,
      managed: true,
      name: true,
      os_platform: true,
      os_version: true,
      registered: true,
      screen_lock_type: true,
      secure_hardware_present: true,
    },
    outcome: {
      reason: true,
      result: true,
    },
    transaction: {
      id: true,
      type: true,
    },
    debug_context: {
      debug_data: {
        device_fingerprint: true,
        dt_hash: true,
        factor: true,
        request_id: true,
        request_uri: true,
        threat_suspected: true,
        risk_behaviors: true,
        risk_level: true,
        risk_reasons: true,
        url: true,
      },
    },
    authentication_context: {
      authentication_provider: true,
      authentication_step: true,
      credential_provider: true,
      credential_type: true,
      external_session_id: true,
      interface: true,
    },
    security_context: {
      as: {
        autonomous_system_number: true,
        organization: {
          name: true,
        },
      },
      domain: true,
      is_proxy: true,
      isp: true,
    },
    uuid: true,
    version: true,
    severity: true,
    display_message: true,
    target: true,
    event_type: true,
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
