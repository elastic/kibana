/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Cluster {
  monitor_ml: boolean;
  manage_ccr: boolean;
  manage_index_templates: boolean;
  monitor_watcher: boolean;
  monitor_transform: boolean;
  read_ilm: boolean;
  manage_security: boolean;
  manage_own_api_key: boolean;
  manage_saml: boolean;
  all: boolean;
  manage_ilm: boolean;
  manage_ingest_pipelines: boolean;
  read_ccr: boolean;
  manage_rollup: boolean;
  monitor: boolean;
  manage_watcher: boolean;
  manage: boolean;
  manage_transform: boolean;
  manage_api_key: boolean;
  manage_token: boolean;
  manage_ml: boolean;
  manage_pipeline: boolean;
  monitor_rollup: boolean;
  transport_client: boolean;
  create_snapshot: boolean;
}

interface Index {
  [indexName: string]: {
    all: boolean;
    manage_ilm: boolean;
    read: boolean;
    create_index: boolean;
    read_cross_cluster: boolean;
    index: boolean;
    monitor: boolean;
    delete: boolean;
    manage: boolean;
    delete_index: boolean;
    create_doc: boolean;
    view_index_metadata: boolean;
    create: boolean;
    manage_follow_index: boolean;
    manage_leader_index: boolean;
    maintenance: boolean;
    write: boolean;
  };
}

interface IndexPrivilege {
  application: {};
  cluster: Cluster;
  has_all_requested: boolean;
  index: Index;
  username: string;
}

export interface Privilege {
  listItems: IndexPrivilege;
  lists: IndexPrivilege;
  is_authenticated: boolean;
}

export const getReadPrivilegeMock = (
  listIndex: string = '.lists-default',
  listItemsIndex: string = '.items-default',
  username = 'elastic',
  booleanValues: boolean = true
): Privilege => ({
  is_authenticated: true,
  listItems: {
    application: {},
    cluster: {
      all: booleanValues,
      create_snapshot: booleanValues,
      manage: booleanValues,
      manage_api_key: booleanValues,
      manage_ccr: booleanValues,
      manage_ilm: booleanValues,
      manage_index_templates: booleanValues,
      manage_ingest_pipelines: booleanValues,
      manage_ml: booleanValues,
      manage_own_api_key: booleanValues,
      manage_pipeline: booleanValues,
      manage_rollup: booleanValues,
      manage_saml: booleanValues,
      manage_security: booleanValues,
      manage_token: booleanValues,
      manage_transform: booleanValues,
      manage_watcher: booleanValues,
      monitor: booleanValues,
      monitor_ml: booleanValues,
      monitor_rollup: booleanValues,
      monitor_transform: booleanValues,
      monitor_watcher: booleanValues,
      read_ccr: booleanValues,
      read_ilm: booleanValues,
      transport_client: booleanValues,
    },
    has_all_requested: booleanValues,
    index: {
      [listItemsIndex]: {
        all: booleanValues,
        create: booleanValues,
        create_doc: booleanValues,
        create_index: booleanValues,
        delete: booleanValues,
        delete_index: booleanValues,
        index: booleanValues,
        maintenance: booleanValues,
        manage: booleanValues,
        manage_follow_index: booleanValues,
        manage_ilm: booleanValues,
        manage_leader_index: booleanValues,
        monitor: booleanValues,
        read: booleanValues,
        read_cross_cluster: booleanValues,
        view_index_metadata: booleanValues,
        write: booleanValues,
      },
    },
    username,
  },
  lists: {
    application: {},
    cluster: {
      all: booleanValues,
      create_snapshot: booleanValues,
      manage: booleanValues,
      manage_api_key: booleanValues,
      manage_ccr: booleanValues,
      manage_ilm: booleanValues,
      manage_index_templates: booleanValues,
      manage_ingest_pipelines: booleanValues,
      manage_ml: booleanValues,
      manage_own_api_key: booleanValues,
      manage_pipeline: booleanValues,
      manage_rollup: booleanValues,
      manage_saml: booleanValues,
      manage_security: booleanValues,
      manage_token: booleanValues,
      manage_transform: booleanValues,
      manage_watcher: booleanValues,
      monitor: booleanValues,
      monitor_ml: booleanValues,
      monitor_rollup: booleanValues,
      monitor_transform: booleanValues,
      monitor_watcher: booleanValues,
      read_ccr: booleanValues,
      read_ilm: booleanValues,
      transport_client: booleanValues,
    },
    has_all_requested: booleanValues,
    index: {
      [listIndex]: {
        all: booleanValues,
        create: booleanValues,
        create_doc: booleanValues,
        create_index: booleanValues,
        delete: booleanValues,
        delete_index: booleanValues,
        index: booleanValues,
        maintenance: booleanValues,
        manage: booleanValues,
        manage_follow_index: booleanValues,
        manage_ilm: booleanValues,
        manage_leader_index: booleanValues,
        monitor: booleanValues,
        read: booleanValues,
        read_cross_cluster: booleanValues,
        view_index_metadata: booleanValues,
        write: booleanValues,
      },
    },
    username,
  },
});
