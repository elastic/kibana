/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllowlistFields } from './types';

// Allow list process fields within events.  This includes "process" and "Target.process".'
const baseAllowlistFields: AllowlistFields = {
  args: true,
  entity_id: true,
  name: true,
  executable: true,
  code_signature: true,
  command_line: true,
  env_vars: true,
  hash: true,
  pid: true,
  pe: true,
  uptime: true,
  Ext: {
    ancestry: true,
    api: true,
    architecture: true,
    code_signature: true,
    dll: true,
    malware_signature: true,
    memory_region: true,
    protection: true,
    services: true,
    session_info: true,
    real: {
      entity_id: true,
    },
    relative_file_creation_time: true,
    relative_file_name_modify_time: true,
    token: {
      elevation: true,
      elevation_type: true,
      integrity_level_name: true,
      security_attributes: true,
    },
    effective_parent: true,
    device: true,
  },
  thread: true,
  working_directory: true,
};

// Allow list for event-related fields, which can also be nested under events[]
const allowlistBaseEventFields: AllowlistFields = {
  credential_access: true,
  destination: true,
  dll: {
    name: true,
    path: true,
    code_signature: true,
    hash: true,
    malware_signature: true,
    pe: true,
    Ext: {
      code_signature: true,
      device: true,
      load_index: true,
      relative_file_creation_time: true,
      relative_file_name_modify_time: true,
    },
  },
  dns: true,
  event: true,
  file: {
    extension: true,
    name: true,
    path: true,
    size: true,
    created: true,
    accessed: true,
    mtime: true,
    directory: true,
    hash: true,
    pe: true,
    Ext: {
      bytes_compressed: true,
      bytes_compressed_present: true,
      code_signature: true,
      header_bytes: true,
      header_data: true,
      malware_classification: true,
      malware_signature: true,
      quarantine_result: true,
      quarantine_message: true,
    },
  },
  message: true,
  process: {
    parent: baseAllowlistFields,
    ...baseAllowlistFields,
  },
  network: true,
  registry: {
    data: {
      strings: true,
    },
    hive: true,
    key: true,
    path: true,
    value: true,
  },
  source: true,
  Target: {
    process: {
      parent: baseAllowlistFields,
      ...baseAllowlistFields,
    },
  },
  url: true,
  user: {
    id: true,
  },
  Persistence: true,
  /* eslint-disable @typescript-eslint/naming-convention */
  Effective_process: true,
};

// Allow list for the data we include in the events. True means that it is deep-cloned
// blindly. Object contents means that we only copy the fields that appear explicitly in
// the sub-object.
export const endpointAllowlistFields: AllowlistFields = {
  _id: true,
  '@timestamp': true,
  signal_id: true,
  agent: true,
  Endpoint: true,
  /* eslint-disable @typescript-eslint/naming-convention */
  Memory_protection: true,
  Ransomware: true,
  data_stream: true,
  ecs: true,
  elastic: true,
  // behavioral protection re-nests some field sets under events.* (< 7.15)
  events: allowlistBaseEventFields,
  // behavioral protection re-nests some field sets under Events.* (>=7.15)
  Events: allowlistBaseEventFields,
  // behavioral protection response data under Response.* (>=7.15)
  Responses: true,
  rule: {
    id: true,
    name: true,
    ruleset: true,
    version: true,
  },
  host: {
    architecture: true,
    id: true,
    os: true,
  },
  package_version: true,
  ...allowlistBaseEventFields,
};
