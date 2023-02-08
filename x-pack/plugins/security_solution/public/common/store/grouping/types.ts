/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GroupOption {
  key: string;
  label: string;
}

export interface GroupModel {
  activeGroup: string;
  options: GroupOption[];
  activePage: number;
  itemsPerPage: number;
}

export interface GroupsById {
  [id: string]: GroupModel;
}

export interface GroupMap {
  groupById: GroupsById;
}

export interface GroupState {
  groups: GroupMap;
}
