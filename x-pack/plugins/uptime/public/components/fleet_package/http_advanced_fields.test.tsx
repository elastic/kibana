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
import { ConfigKeys, DataStream, HTTPMethod, Mode, ResponseBodyIndexPolicy } from './types';
import { validate as centralValidation } from './validation';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultConfig = {
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
    // ComboBox has an issue with associating labels with the field
    const responseStatusEquals = getByText('Check response status equals');
    // ComboBox has an issue with associating labels with the field
    const responseBodyContains = getByText('Check response body contains');
    // ComboBox has an issue with associating labels with the field
    const responseBodyDoesNotContain = getByText('Check response body does not contain');
    // ComboBox has an issue with associating labels with the field
    const responseHeadersContain = getByText('Check response headers contain');
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
    expect(responseStatusEquals).toBeInTheDocument();
    expect(responseBodyContains).toBeInTheDocument();
    expect(responseBodyDoesNotContain).toBeInTheDocument();
    expect(responseHeadersContain).toBeInTheDocument();
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
