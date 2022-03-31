/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import {
  defaultHTTPAdvancedFields as defaultConfig,
  HTTPAdvancedFieldsContextProvider,
} from '../contexts';
import {
  ConfigKey,
  DataStream,
  HTTPAdvancedFields as HTTPAdvancedFieldsType,
  HTTPMethod,
  Validation,
} from '../types';
import { validate as centralValidation } from '../validation';
import { HTTPAdvancedFields } from './advanced_fields';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

jest.mock('../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../../src/plugins/kibana_react/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

const defaultValidation = centralValidation[DataStream.HTTP];

describe('<HTTPAdvancedFields />', () => {
  const onFieldBlur = jest.fn();

  const WrappedComponent = ({
    defaultValues,
    validate = defaultValidation,
    children,
  }: {
    defaultValues?: HTTPAdvancedFieldsType;
    validate?: Validation;
    children?: React.ReactNode;
  }) => {
    return (
      <HTTPAdvancedFieldsContextProvider defaultValues={defaultValues}>
        <HTTPAdvancedFields validate={validate} onFieldBlur={onFieldBlur}>
          {children}
        </HTTPAdvancedFields>
      </HTTPAdvancedFieldsContextProvider>
    );
  };

  it('renders HTTPAdvancedFields', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    const requestMethod = getByLabelText('Request method') as HTMLInputElement;
    const requestHeaders = getByText('Request headers');
    const requestBody = getByText('Request body');
    const indexResponseBody = getByLabelText('Index response body') as HTMLInputElement;
    const indexResponseBodySelect = getByLabelText(
      'Response body index policy'
    ) as HTMLInputElement;
    const indexResponseHeaders = getByLabelText('Index response headers') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const responseHeadersContain = getByText('Check response headers contain');
    const responseStatusEquals = getByText('Check response status equals');
    const responseBodyContains = getByText('Check response body contains');
    const responseBodyDoesNotContain = getByText('Check response body does not contain');
    const username = getByLabelText('Username') as HTMLInputElement;
    const password = getByLabelText('Password') as HTMLInputElement;
    expect(requestMethod).toBeInTheDocument();
    expect(requestMethod.value).toEqual(defaultConfig[ConfigKey.REQUEST_METHOD_CHECK]);
    expect(requestHeaders).toBeInTheDocument();
    expect(requestBody).toBeInTheDocument();
    expect(indexResponseBody).toBeInTheDocument();
    expect(indexResponseBody.checked).toBe(true);
    expect(indexResponseBodySelect).toBeInTheDocument();
    expect(indexResponseBodySelect.value).toEqual(defaultConfig[ConfigKey.RESPONSE_BODY_INDEX]);
    expect(indexResponseHeaders).toBeInTheDocument();
    expect(indexResponseHeaders.checked).toBe(true);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultConfig[ConfigKey.PROXY_URL]);
    expect(responseStatusEquals).toBeInTheDocument();
    expect(responseBodyContains).toBeInTheDocument();
    expect(responseBodyDoesNotContain).toBeInTheDocument();
    expect(responseHeadersContain).toBeInTheDocument();
    expect(username).toBeInTheDocument();
    expect(username.value).toBe(defaultConfig[ConfigKey.USERNAME]);
    expect(password).toBeInTheDocument();
    expect(password.value).toBe(defaultConfig[ConfigKey.PASSWORD]);
  });

  it('handles changing fields', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    const username = getByLabelText('Username') as HTMLInputElement;
    const password = getByLabelText('Password') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const requestMethod = getByLabelText('Request method') as HTMLInputElement;
    const requestHeaders = getByText('Request headers');
    const indexResponseBody = getByLabelText('Index response body') as HTMLInputElement;
    const indexResponseHeaders = getByLabelText('Index response headers') as HTMLInputElement;

    fireEvent.change(username, { target: { value: 'username' } });
    fireEvent.change(password, { target: { value: 'password' } });
    fireEvent.change(proxyUrl, { target: { value: 'proxyUrl' } });
    fireEvent.change(requestMethod, { target: { value: HTTPMethod.POST } });
    fireEvent.click(indexResponseBody);
    fireEvent.click(indexResponseHeaders);

    expect(username.value).toEqual('username');
    expect(password.value).toEqual('password');
    expect(proxyUrl.value).toEqual('proxyUrl');
    expect(requestMethod.value).toEqual(HTTPMethod.POST);
    expect(requestHeaders).toBeInTheDocument();
    expect(indexResponseBody.checked).toBe(false);
    expect(indexResponseHeaders.checked).toBe(false);
  });

  it('calls onBlur', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const username = getByLabelText('Username') as HTMLInputElement;
    const requestMethod = getByLabelText('Request method') as HTMLInputElement;
    const indexResponseBody = getByLabelText('Index response body') as HTMLInputElement;

    [username, requestMethod, indexResponseBody].forEach((field) => fireEvent.blur(field));

    expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.USERNAME);
    expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.REQUEST_METHOD_CHECK);
    expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.RESPONSE_BODY_INDEX);
  });

  it('renders upstream fields', () => {
    const upstreamFieldsText = 'Monitor Advanced field section';
    const { getByText } = render(<WrappedComponent>{upstreamFieldsText}</WrappedComponent>);

    const upstream = getByText(upstreamFieldsText) as HTMLInputElement;
    expect(upstream).toBeInTheDocument();
  });
});
