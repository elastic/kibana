/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { HTTPAdvancedFields } from './http_advanced_fields';
import {
  ConfigKeys,
  DataStream,
  HTTPMethod,
  Mode,
  ResponseBodyIndexPolicy,
  IHTTPAdvancedFields,
} from './types';
import { validate as centralValidation } from './validation';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultConfig: IHTTPAdvancedFields = {
  [ConfigKeys.PASSWORD]: 'password',
  [ConfigKeys.PROXY_URL]: 'test',
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKeys.RESPONSE_STATUS_CHECK]: [], // may need to make sure that this field is not applied when length is 0
  [ConfigKeys.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.TEXT,
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: {},
  [ConfigKeys.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKeys.USERNAME]: 'password',
};

const defaultValidation = centralValidation[DataStream.HTTP];

describe('<HTTPAdvancedFields />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ defaultValues = defaultConfig, validate = defaultValidation }) => {
    return (
      <HTTPAdvancedFields defaultValues={defaultValues} onChange={onChange} validate={validate} />
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
    expect(requestMethod.value).toEqual(defaultConfig[ConfigKeys.REQUEST_METHOD_CHECK]);
    expect(requestHeaders).toBeInTheDocument();
    expect(requestBody).toBeInTheDocument();
    expect(indexResponseBody).toBeInTheDocument();
    expect(indexResponseBody.checked).toBe(true);
    expect(indexResponseBodySelect).toBeInTheDocument();
    expect(indexResponseBodySelect.value).toEqual(defaultConfig[ConfigKeys.RESPONSE_BODY_INDEX]);
    expect(indexResponseHeaders).toBeInTheDocument();
    expect(indexResponseHeaders.checked).toBe(true);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultConfig[ConfigKeys.PROXY_URL]);
    expect(responseStatusEquals).toBeInTheDocument();
    expect(responseBodyContains).toBeInTheDocument();
    expect(responseBodyDoesNotContain).toBeInTheDocument();
    expect(responseHeadersContain).toBeInTheDocument();
    expect(username).toBeInTheDocument();
    expect(username.value).toBe(defaultConfig[ConfigKeys.USERNAME]);
    expect(password).toBeInTheDocument();
    expect(password.value).toBe(defaultConfig[ConfigKeys.PASSWORD]);
  });

  it('handles changing fields', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    const requestMethod = getByLabelText('Request method') as HTMLInputElement;
    const requestHeaders = getByText('Request headers');
    const indexResponseBody = getByLabelText('Index response body') as HTMLInputElement;
    const indexResponseHeaders = getByLabelText('Index response headers') as HTMLInputElement;

    fireEvent.change(requestMethod, { target: { value: HTTPMethod.POST } });
    fireEvent.click(indexResponseBody);
    fireEvent.click(indexResponseHeaders);

    expect(requestMethod.value).toEqual(HTTPMethod.POST);
    expect(requestHeaders).toBeInTheDocument();
    expect(indexResponseBody.checked).toBe(false);
    expect(indexResponseHeaders.checked).toBe(false);
  });

  it('handles onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const requestMethod = getByLabelText('Request method') as HTMLInputElement;

    fireEvent.change(requestMethod, { target: { value: HTTPMethod.POST } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.REQUEST_METHOD_CHECK]: HTTPMethod.POST,
        })
      );
    });
  });
});
