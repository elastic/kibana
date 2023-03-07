/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type React from 'react';

const actionCreator = actionCreatorFactory('x-pack/security_solution/groups');

export const updateGroupSelector = actionCreator<{
  groupSelector: React.ReactElement;
}>('UPDATE_GROUP_SELECTOR');

export const updateSelectedGroup = actionCreator<{
  selectedGroup: string;
}>('UPDATE_SELECTED_GROUP');
