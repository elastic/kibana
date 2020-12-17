/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';
import { InitialAlert } from './alert_reducer';

const DEEP_COMPARE_FIELDS = ['tags', 'schedule', 'actions', 'params', 'notifyWhen'];

function getNonNullCompareFields(alert: InitialAlert) {
  const { name, alertTypeId, throttle } = alert;
  return {
    ...(!!(name && name.length > 0) ? { name } : {}),
    ...(!!(alertTypeId && alertTypeId.length > 0) ? { alertTypeId } : {}),
    ...(!!(throttle && throttle.length > 0) ? { throttle } : {}),
  };
}

export function alertHasChanged(a: InitialAlert, b: InitialAlert) {
  // Deep compare these fields
  const objectsAreEqual = deepEqual(pick(a, DEEP_COMPARE_FIELDS), pick(b, DEEP_COMPARE_FIELDS));

  const nonNullCompareFieldsAreEqual = deepEqual(
    getNonNullCompareFields(a),
    getNonNullCompareFields(b)
  );

  return !objectsAreEqual || !nonNullCompareFieldsAreEqual;
}
