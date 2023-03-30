/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { GroupState } from './types';

const groupSelector = (state: GroupState) => state.groups.groupSelector;

export const getGroupSelector = () => createSelector(groupSelector, (selector) => selector);

export const selectedGroup = (state: GroupState) => state.groups.selectedGroup;

export const getSelectedGroup = () => createSelector(selectedGroup, (group) => group);
