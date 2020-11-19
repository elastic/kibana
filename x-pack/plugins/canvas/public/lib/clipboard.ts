/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOCALSTORAGE_CLIPBOARD } from '../../common/lib/constants';
import { getLocalStorage } from './storage';

export const setClipboardData = (data: any) => {
  getLocalStorage().set(LOCALSTORAGE_CLIPBOARD, JSON.stringify(data));
};

export const getClipboardData = () => getLocalStorage().get(LOCALSTORAGE_CLIPBOARD);
