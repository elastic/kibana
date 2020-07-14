/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getContext, kea, resetContext } from 'kea';

resetContext({ createStore: true });

export const store = getContext().store;

export const storeLogic = (logic: object) => kea(logic);
