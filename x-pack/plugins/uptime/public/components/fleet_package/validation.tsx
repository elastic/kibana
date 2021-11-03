/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ConfigKeys,
  DataStream,
  ICustomFields,
  Validator,
  Validation,
  ScheduleUnit,
} from './types';

export const digitsOnly = /^[0-9]*$/g;
export const includesValidPort = /[^\:]+:[0-9]{1,5}$/g;

type ValidationLibrary = Record<string, Validator>;

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
const validateTimeout = ({
  scheduleNumber,
  scheduleUnit,
  timeout,
}: {
  scheduleNumber: string;
  scheduleUnit: ScheduleUnit;
  timeout: string;
}): boolean => {
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
};

// validation functions return true when invalid
const validateCommon: ValidationLibrary = {
  [ConfigKeys.SCHEDULE]: ({ [ConfigKeys.SCHEDULE]: value }) => {
    const { number, unit } = value as ICustomFields[ConfigKeys.SCHEDULE];
    const parsedFloat = parseFloat(number);
    return !parsedFloat || !unit || parsedFloat < 1;
  },
  [ConfigKeys.TIMEOUT]: ({ [ConfigKeys.TIMEOUT]: timeout, [ConfigKeys.SCHEDULE]: schedule }) => {
    const { number, unit } = schedule as ICustomFields[ConfigKeys.SCHEDULE];

    return (
      !timeout ||
      parseFloat(timeout) < 0 ||
      validateTimeout({
        timeout,
        scheduleNumber: number,
        scheduleUnit: unit,
      })
    );
  },
};

const validateHTTP: ValidationLibrary = {
  [ConfigKeys.RESPONSE_STATUS_CHECK]: ({ [ConfigKeys.RESPONSE_STATUS_CHECK]: value }) => {
    const statusCodes = value as ICustomFields[ConfigKeys.RESPONSE_STATUS_CHECK];
    return statusCodes.length ? statusCodes.some((code) => !`${code}`.match(digitsOnly)) : false;
  },
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: ({ [ConfigKeys.RESPONSE_HEADERS_CHECK]: value }) => {
    const headers = value as ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: ({ [ConfigKeys.REQUEST_HEADERS_CHECK]: value }) => {
    const headers = value as ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.MAX_REDIRECTS]: ({ [ConfigKeys.MAX_REDIRECTS]: value }) =>
    (!!value && !`${value}`.match(digitsOnly)) ||
    parseFloat(value as ICustomFields[ConfigKeys.MAX_REDIRECTS]) < 0,
  [ConfigKeys.URLS]: ({ [ConfigKeys.URLS]: value }) => !value,
  ...validateCommon,
};

const validateTCP: Record<string, Validator> = {
  [ConfigKeys.HOSTS]: ({ [ConfigKeys.HOSTS]: value }) => {
    return !value || !`${value}`.match(includesValidPort);
  },
  ...validateCommon,
};

const validateICMP: ValidationLibrary = {
  [ConfigKeys.HOSTS]: ({ [ConfigKeys.HOSTS]: value }) => !value,
  [ConfigKeys.WAIT]: ({ [ConfigKeys.WAIT]: value }) =>
    !!value &&
    !digitsOnly.test(`${value}`) &&
    parseFloat(value as ICustomFields[ConfigKeys.WAIT]) < 0,
  ...validateCommon,
};

const validateBrowser: ValidationLibrary = {
  ...validateCommon,
  [ConfigKeys.SOURCE_ZIP_URL]: ({
    [ConfigKeys.SOURCE_ZIP_URL]: zipUrl,
    [ConfigKeys.SOURCE_INLINE]: inlineScript,
  }) => !zipUrl && !inlineScript,
  [ConfigKeys.SOURCE_INLINE]: ({
    [ConfigKeys.SOURCE_ZIP_URL]: zipUrl,
    [ConfigKeys.SOURCE_INLINE]: inlineScript,
  }) => !zipUrl && !inlineScript,
};

export type ValidateDictionary = Record<DataStream, Validation>;

export const validate: ValidateDictionary = {
  [DataStream.HTTP]: validateHTTP,
  [DataStream.TCP]: validateTCP,
  [DataStream.ICMP]: validateICMP,
  [DataStream.BROWSER]: validateBrowser,
};
