/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { Semaphore } from '@kbn/std';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';

const [getSingleton, setSingleton] = createGetterSetter<Semaphore>('esStoreSemaphore');

export const configureSemaphore = once((capacity: number) => {
  setSingleton(new Semaphore(capacity));
});

export const getSemaphore = getSingleton;
