/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { pipe } from 'fp-ts/lib/pipeable';
import { tryCatch, fold } from 'fp-ts/lib/Either';

import { DEPRECATION_WARNING_UPPER_LIMIT } from '../../../common/constants';
import { Storage } from '../../shared_imports';

export const validateRegExpString = (s: string) =>
  pipe(
    tryCatch(
      () => new RegExp(s),
      (e) => (e as Error).message
    ),
    fold(
      (errorMessage: string) => errorMessage,
      () => ''
    )
  );

/*
 * There isnt much difference between having 1M or 1.1M deprecation warnings, the number is
 * so big it beats the purpose of having a little preview of the count. With this we can also
 * prevent the container of the value to grow due to the value being so large.
 */
export const getDeprecationsUpperLimit = (count: number) => {
  if (count > DEPRECATION_WARNING_UPPER_LIMIT) {
    return `${DEPRECATION_WARNING_UPPER_LIMIT}+`;
  }

  return count.toString();
};

const LS_SETTING_ID = 'kibana.upgradeAssistant.lastCheckpoint';
const localStorage = new Storage(window.localStorage);

export const getLastCheckpointFromLS = () => {
  const storedValue = moment(localStorage.get(LS_SETTING_ID));

  if (storedValue.isValid()) {
    return storedValue.toISOString();
  }

  const now = moment().toISOString();
  localStorage.set(LS_SETTING_ID, now);

  return now;
};

export const setLastCheckpointToLS = (value: string) => {
  localStorage.set(LS_SETTING_ID, value);
};
