/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCheckbox,
  EuiCode,
  EuiComboBox,
  EuiFieldText,
  EuiFieldNumber,
  EuiSelect,
  EuiFieldPassword,
} from '@elastic/eui';
import { MonitorTypeRadioGroup } from '../fields/monitor_type_radio_group';
import { DataStream, ConfigKey, HTTPMethod } from '../types';
import { HeaderField } from '../fields/header_field';
import { RequestBodyField } from '../fields/request_body_field';
import { ResponseBodyIndexField } from '../fields/index_response_body_field';
import { ComboBox } from '../fields/combo_box';

export interface FieldMeta {
  key: ConfigKey;
  component: React.ComponentType<any>;
  label?: string;
  ariaLabel?: string;
  helpText?: string | React.ReactNode;
  props?: Record<string, any>;
  controlled?: boolean;
  required?: boolean;
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  ) => void;
}

export interface AdvancedFieldGroup {
  title: string;
  description: string;
  components: FieldMeta[];
}

export type FieldConfig = Record<
  DataStream,
  {
    step1: FieldMeta[];
    step2: FieldMeta[];
    step3?: FieldMeta[];
    advanced?: AdvancedFieldGroup[];
  }
>;

export const FIELD: Record<ConfigKey, FieldMeta> = {
  [ConfigKey.MONITOR_TYPE]: {
    key: ConfigKey.MONITOR_TYPE,
    component: MonitorTypeRadioGroup,
    ariaLabel: 'Monitor Type',
  },
  [ConfigKey.URLS]: {
    key: ConfigKey.URLS,
    component: EuiFieldText,
    label: 'Website URL',
    helpText: 'For example, https://www.elastic.co',
  },
  [ConfigKey.NAME]: {
    key: ConfigKey.NAME,
    component: EuiFieldText,
    label: 'Monitor name',
    helpText: 'Choose a name to help identify this monitor in the future.',
  },
  [ConfigKey.SCHEDULE]: {
    key: `${ConfigKey.SCHEDULE}.number`,
    component: EuiSelect,
    label: 'Frequency',
    helpText:
      'How often do you want to run this test? Higher frequencies will increase your total cost.',
    props: {
      options: [
        {
          value: '3',
          text: 'Every 3 minutes',
        },
        {
          value: '10',
          text: 'Every 10 minutes',
        },
        {
          value: '60',
          text: 'Every 60 minutes',
        },
      ],
    },
  },
  [ConfigKey.MAX_REDIRECTS]: {
    key: ConfigKey.MAX_REDIRECTS,
    component: EuiFieldNumber,
    label: 'Max redirects',
    helpText: 'The total number of redirects to follow.',
    props: {
      min: 0,
      max: 10,
      step: 1,
    },
  },
  [ConfigKey.USERNAME]: {
    key: ConfigKey.USERNAME,
    component: EuiFieldText,
    label: 'Username',
    helpText: 'Username for authenticating with the server.',
  },
  [ConfigKey.PASSWORD]: {
    key: ConfigKey.PASSWORD,
    component: EuiFieldPassword,
    label: 'Password',
    helpText: 'Password for authenticating with the server.',
  },
  [ConfigKey.PROXY_URL]: {
    key: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: 'Proxy URL',
    helpText: 'HTTP Proxy URL.',
  },
  [ConfigKey.PROXY_URL]: {
    key: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: 'Proxy URL',
    helpText: 'HTTP Proxy URL.',
  },
  [ConfigKey.REQUEST_METHOD_CHECK]: {
    key: ConfigKey.REQUEST_METHOD_CHECK,
    component: EuiSelect,
    label: 'Request Method',
    helpText: 'The HTTP method to use.',
    props: {
      options: Object.keys(HTTPMethod).map((method) => ({
        value: method,
        text: method,
      })),
    },
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {
    key: ConfigKey.REQUEST_HEADERS_CHECK,
    component: HeaderField,
    label: 'Request Method',
    helpText:
      'A dictionary of additional HTTP headers to send. By default the client will set the User-Agent header to identify itself.',
    controlled: true,
  },
  [ConfigKey.REQUEST_BODY_CHECK]: {
    key: ConfigKey.REQUEST_BODY_CHECK,
    component: RequestBodyField,
    label: 'Request Body',
    helpText: 'Request body content.',
    controlled: true,
  },
  [ConfigKey.RESPONSE_HEADERS_INDEX]: {
    key: ConfigKey.RESPONSE_HEADERS_INDEX,
    component: EuiCheckbox,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText"
          defaultMessage="Controls the indexing of the HTTP response headers to "
        />
        <EuiCode>http.response.body.headers</EuiCode>
      </>
    ),
    props: {
      label: 'Index response headers',
    },
    controlled: true,
  },
  [ConfigKey.RESPONSE_BODY_INDEX]: {
    key: ConfigKey.RESPONSE_BODY_INDEX,
    component: ResponseBodyIndexField,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText"
          defaultMessage="Controls the indexing of the HTTP response body contents to"
        />
        <EuiCode>http.response.body.contents</EuiCode>
      </>
    ),
    props: {
      label: 'Index response body',
    },
    controlled: true,
  },
  [ConfigKey.RESPONSE_STATUS_CHECK]: {
    key: ConfigKey.RESPONSE_STATUS_CHECK,
    component: ComboBox,
    label: 'Check response status equals',
    helpText:
      'A list of expected status codes. Press enter to add a new code. 4xx and 5xx codes are considered down by default. Other codes are considered up.',
    controlled: true,
  },
};

export const ADVANCED_FIELD_CONFIG = {
  requestConfig: {
    title: 'Request configuration',
    description:
      'Configure an optional request to send to the remote host including method, body, and headers.',
    components: [
      FIELD[ConfigKey.USERNAME],
      FIELD[ConfigKey.PASSWORD],
      FIELD[ConfigKey.PROXY_URL],
      FIELD[ConfigKey.REQUEST_METHOD_CHECK],
      FIELD[ConfigKey.REQUEST_HEADERS_CHECK],
      FIELD[ConfigKey.REQUEST_BODY_CHECK],
    ],
  },
  responseConfig: {
    title: 'Response configuration',
    description: 'Control the indexing of the HTTP response contents.',
    components: [FIELD[ConfigKey.RESPONSE_HEADERS_INDEX], FIELD[ConfigKey.RESPONSE_BODY_INDEX]],
  },
  responseChecks: {
    title: 'Response checks',
    description: 'Configure the expected HTTP response.',
    components: [FIELD[ConfigKey.RESPONSE_STATUS_CHECK]],
  },
};

export const FIELD_CONFIG: FieldConfig = {
  [DataStream.HTTP]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [
      FIELD[ConfigKey.URLS],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.MAX_REDIRECTS],
    ],
    advanced: [
      ADVANCED_FIELD_CONFIG.requestConfig,
      ADVANCED_FIELD_CONFIG.responseConfig,
      ADVANCED_FIELD_CONFIG.responseChecks,
    ],
  },
};
