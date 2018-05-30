/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraGroup, InfraGroupBy } from '../../../../../common/types';

import { get } from 'lodash';
import { getFilterLabel } from './get_filter_label';

type InfraCreateGroupFn<T> = (label: string) => T;

function createGroupWithSubGroups(label: string): InfraGroup {
  return { name: label, groups: [] as InfraGroup[] };
}

function createGroupWithNodes(label: string): InfraGroup {
  return { name: label };
}

function findOrCreateGroup<T>(
  groups: T[],
  name: string,
  groupDef: InfraGroupBy,
  createFn: InfraCreateGroupFn<T>
): T {
  const existingGroup: T | undefined = groups.find(
    (group: T): boolean => get(group, 'name') === name
  );
  if (existingGroup) {
    return existingGroup;
  }
  const label = getFilterLabel(groupDef, name);
  return createFn(label);
}

export function findOrCreateGroupWithSubGroups(
  groups: InfraGroup[],
  name: string,
  groupDef: InfraGroupBy
): InfraGroup {
  return findOrCreateGroup(groups, name, groupDef, createGroupWithSubGroups);
}

export function findOrCreateGroupWithNodes(
  groups: InfraGroup[],
  name: string,
  groupDef: InfraGroupBy
): InfraGroup {
  return findOrCreateGroup(groups, name, groupDef, createGroupWithNodes);
}
