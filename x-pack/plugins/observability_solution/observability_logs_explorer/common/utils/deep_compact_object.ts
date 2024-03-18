/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isPlainObject, isUndefined } from 'lodash';

export const deepCompactObject = <Value extends Record<string, any>>(obj: Value): Value =>
  Object.fromEntries(
    Object.entries(obj)
      .map(([key, value]) => [key, isPlainObject(value) ? deepCompactObject(value) : value])
      .filter(([, value]) => !isUndefined(value) && !(isPlainObject(value) && isEmpty(value)))
  );
