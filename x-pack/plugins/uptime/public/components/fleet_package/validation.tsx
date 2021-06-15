/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKeys, DataStream, ICustomFields, Validation, ScheduleUnit } from './types';

export const digitsOnly = /^[0-9]*$/g;
export const includesValidPort = /[^\:]+:[0-9]{1,5}$/g;

// returns true if invalid
function validateHeaders<T>(headers: T): boolean {
  return Object.keys(headers).some((key) => {
    if (key) {
      const whiteSpaceRegEx = /[\s]/g;
      return whiteSpaceRegEx.test(key);
    } else {
      return false;
    }
  });
}

// returns true if invalid
function validateTimeout({
  scheduleNumber,
  scheduleUnit,
  timeout,
}: {
  scheduleNumber: string;
  scheduleUnit: ScheduleUnit;
  timeout: string;
}): boolean {
  let schedule: number;
  switch (scheduleUnit) {
    case ScheduleUnit.SECONDS:
      schedule = parseFloat(scheduleNumber);
      break;
    case ScheduleUnit.MINUTES:
      schedule = parseFloat(scheduleNumber) * 60;
      break;
    default:
      schedule = parseFloat(scheduleNumber);
  }

  return parseFloat(timeout) > schedule;
}

// validation functions return true when invalid
const validateCommon = {
  [ConfigKeys.MAX_REDIRECTS]: (value: unknown) =>
    (!!value && !`${value}`.match(digitsOnly)) ||
    parseFloat(value as ICustomFields[ConfigKeys.MAX_REDIRECTS]) < 0,
  [ConfigKeys.MONITOR_TYPE]: (value: unknown) => !value,
  [ConfigKeys.SCHEDULE]: (value: unknown) => {
    const { number, unit } = value as ICustomFields[ConfigKeys.SCHEDULE];
    const parsedFloat = parseFloat(number);
    return !parsedFloat || !unit || parsedFloat < 1;
  },
  [ConfigKeys.TIMEOUT]: (
    timeoutValue: unknown,
    scheduleNumber: string,
    scheduleUnit: ScheduleUnit
  ) =>
    !timeoutValue ||
    parseFloat(timeoutValue as ICustomFields[ConfigKeys.TIMEOUT]) < 0 ||
    validateTimeout({
      timeout: timeoutValue as ICustomFields[ConfigKeys.TIMEOUT],
      scheduleNumber,
      scheduleUnit,
    }),
};

const validateHTTP = {
  [ConfigKeys.RESPONSE_STATUS_CHECK]: (value: unknown) => {
    const statusCodes = value as ICustomFields[ConfigKeys.RESPONSE_STATUS_CHECK];
    return statusCodes.length ? statusCodes.some((code) => !`${code}`.match(digitsOnly)) : false;
  },
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: (value: unknown) => {
    const headers = value as ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: (value: unknown) => {
    const headers = value as ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.URLS]: (value: unknown) => !value,
  ...validateCommon,
};

const validateTCP = {
  [ConfigKeys.HOSTS]: (value: unknown) => {
    return !value || !`${value}`.match(includesValidPort);
  },
  ...validateCommon,
};

const validateICMP = {
  [ConfigKeys.HOSTS]: (value: unknown) => !value,
  [ConfigKeys.WAIT]: (value: unknown) =>
    !!value &&
    !digitsOnly.test(`${value}`) &&
    parseFloat(value as ICustomFields[ConfigKeys.WAIT]) < 0,
  ...validateCommon,
};

export type ValidateDictionary = Record<DataStream, Validation>;

export const validate: ValidateDictionary = {
  [DataStream.HTTP]: validateHTTP,
  [DataStream.TCP]: validateTCP,
  [DataStream.ICMP]: validateICMP,
};
