/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { GroupOption } from './types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/groups');

export const updateActiveGroup = actionCreator<{
  id: string;
  activeGroup: string;
}>('UPDATE_ACTIVE_GROUP');

export const updateGroupActivePage = actionCreator<{
  id: string;
  activePage: number;
}>('UPDATE_GROUP_ACTIVE_PAGE');

export const updateGroupItemsPerPage = actionCreator<{
  id: string;
  itemsPerPage: number;
}>('UPDATE_GROUP_ITEMS_PER_PAGE');

export const updateGroupOptions = actionCreator<{
  id: string;
  newOptionList: GroupOption[];
}>('UPDATE_GROUP_OPTIONS');

export const initGrouping = actionCreator<{
  id: string;
}>('INIT_GROUPING');
