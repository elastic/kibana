/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { HotKey } from '../components/shortcuts';

export const registerShortcut = createAction<HotKey>('REGISTER SHORTCUT');
export const unregisterShortcut = createAction<HotKey>('UNREGISTER SHORTCUT');

export const toggleHelp = createAction<boolean | null>('TOGGLE SHORTCUTS HELP');
