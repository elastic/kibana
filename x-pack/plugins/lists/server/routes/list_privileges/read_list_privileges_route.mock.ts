/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Cluster {
  monitor_ml: boolean;
  manage_index_templates: boolean;
  monitor_transform: boolean;
  manage_security: boolean;
  manage_own_api_key: boolean;
  all: boolean;
  monitor: boolean;
  manage: boolean;
  manage_transform: boolean;
  manage_api_key: boolean;
  manage_ml: boolean;
  manage_pipeline: boolean;
}

interface Index {
  [indexName: string]: {
    all: boolean;
    read: boolean;
    create_index: boolean;
    index: boolean;
    monitor: boolean;
    delete: boolean;
    manage: boolean;
    delete_index: boolean;
    create_doc: boolean;
    view_index_metadata: boolean;
    create: boolean;
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
      manage: booleanValues,
      manage_api_key: booleanValues,
      manage_index_templates: booleanValues,
      manage_ml: booleanValues,
      manage_own_api_key: booleanValues,
      manage_pipeline: booleanValues,
      manage_security: booleanValues,
      manage_transform: booleanValues,
      monitor: booleanValues,
      monitor_ml: booleanValues,
      monitor_transform: booleanValues,
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
        monitor: booleanValues,
        read: booleanValues,
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
      manage: booleanValues,
      manage_api_key: booleanValues,
      manage_index_templates: booleanValues,
      manage_ml: booleanValues,
      manage_own_api_key: booleanValues,
      manage_pipeline: booleanValues,
      manage_security: booleanValues,
      manage_transform: booleanValues,
      monitor: booleanValues,
      monitor_ml: booleanValues,
      monitor_transform: booleanValues,
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
        monitor: booleanValues,
        read: booleanValues,
        view_index_metadata: booleanValues,
        write: booleanValues,
      },
    },
    username,
  },
});
