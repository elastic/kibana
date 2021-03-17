/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import {
  Config,
  ConfigKeys,
  DataStream,
  HTTPMethod,
  ICustomFields,
  Mode,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  Validation,
} from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const { config, setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange, validate });

    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for synthetics, we want the user to explicitely type in a name to use as the monitor name,
    // so we blank it out only during 1st component render (thus why the eslint disabled rule below).
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return (
      <CustomFields
        defaultValues={defaultValues}
        onChange={handleInputChange}
        validate={validate[config[ConfigKeys.MONITOR_TYPE]]}
      />
    );
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';

const defaultValues = {
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: 0,
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: false,
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: [],
  [ConfigKeys.RESPONSE_STATUS_CHECK]: [], // may need to make sure that this field is not applied when length is 0
  [ConfigKeys.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.TEXT,
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: {},
  [ConfigKeys.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKeys.REQUEST_SEND_CHECK]: '',
  [ConfigKeys.SCHEDULE]: {
    number: '5',
    unit: ScheduleUnit.SECONDS,
  },
  [ConfigKeys.SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: 1600,
  [ConfigKeys.URLS]: '',
  [ConfigKeys.WAIT]: 1,
};

const defaultConfig: Config = {
  name: '',
  ...defaultValues,
};

const digitsOnly = /^[0-9]*$/g;

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

// validation functions return true when invalid
const validateCommon = {
  [ConfigKeys.MAX_REDIRECTS]: (value: unknown) =>
    !!value &&
    !digitsOnly.test(`${value}`) &&
    (value as ICustomFields[ConfigKeys.MAX_REDIRECTS]) < 0,
  [ConfigKeys.MONITOR_TYPE]: (value: unknown) => !value,
  [ConfigKeys.SCHEDULE]: (value: unknown) => {
    const { number, unit } = value as ICustomFields[ConfigKeys.SCHEDULE];
    const parsedFloat = parseFloat(number);
    return !parsedFloat || !unit || !`${number}`.match(digitsOnly) || parsedFloat < 1;
  },
  [ConfigKeys.TIMEOUT]: (value: unknown) =>
    !!value && !digitsOnly.test(`${value}`) && (value as ICustomFields[ConfigKeys.TIMEOUT]) < 0,
};

const validateHTTP = {
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: (value: unknown) => {
    const headers = value as ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.RESPONSE_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: (value: unknown) => {
    const headers = value as ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK];
    return validateHeaders<ICustomFields[ConfigKeys.REQUEST_HEADERS_CHECK]>(headers);
  },
  [ConfigKeys.URLS]: (value: unknown) => !value, // TODO: regex for urls
  ...validateCommon,
};

const validateTCP = {
  [ConfigKeys.HOSTS]: (value: unknown) => !value, // TODO: regex for hosts,
  ...validateCommon,
};

const validateICMP = {
  [ConfigKeys.HOSTS]: (value: unknown) => !value,
  [ConfigKeys.WAIT]: (value: unknown) =>
    !!value && !digitsOnly.test(`${value}`) && (value as ICustomFields[ConfigKeys.WAIT]) < 0,
  ...validateCommon,
};

type ValidateDictionary = Record<DataStream, Validation>;

const validate: ValidateDictionary = {
  [DataStream.HTTP]: validateHTTP,
  [DataStream.TCP]: validateTCP,
  [DataStream.ICMP]: validateICMP,
};
