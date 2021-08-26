/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AllowlistFields {
  [key: string]: boolean | AllowlistFields;
}

// Allow list process fields within events.  This includes "process" and "Target.process".'
const allowlistProcessFields: AllowlistFields = {
  args: true,
  name: true,
  executable: true,
  code_signature: true,
  command_line: true,
  hash: true,
  pid: true,
  pe: {
    original_file_name: true,
  },
  uptime: true,
  Ext: {
    architecture: true,
    code_signature: true,
    dll: true,
    malware_signature: true,
    memory_region: true,
    token: {
      integrity_level_name: true,
    },
  },
  thread: true,
  working_directory: true,
};

// Allow list for event-related fields, which can also be nested under events[]
const allowlistBaseEventFields: AllowlistFields = {
  dll: {
    name: true,
    path: true,
    code_signature: true,
    malware_signature: true,
    pe: {
      original_file_name: true,
    },
  },
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
    Ext: {
      code_signature: true,
      header_data: true,
      malware_classification: true,
      malware_signature: true,
      quarantine_result: true,
      quarantine_message: true,
    },
  },
  process: {
    parent: allowlistProcessFields,
    ...allowlistProcessFields,
  },
  network: {
    direction: true,
  },
  registry: {
    data: {
      strings: true,
    },
    hive: true,
    key: true,
    path: true,
    value: true,
  },
  Target: {
    process: {
      parent: allowlistProcessFields,
      ...allowlistProcessFields,
    },
  },
  user: {
    id: true,
  },
};

// Allow list for the data we include in the events. True means that it is deep-cloned
// blindly. Object contents means that we only copy the fields that appear explicitly in
// the sub-object.
export const allowlistEventFields: AllowlistFields = {
  '@timestamp': true,
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
  rule: {
    id: true,
    name: true,
    ruleset: true,
    version: true,
  },
  host: {
    os: true,
  },
  ...allowlistBaseEventFields,
};
