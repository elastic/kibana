/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShortcutManager } from 'react-shortcuts';
import { keymap } from './keymap';

export const shortcutManager = new ShortcutManager(keymap);
