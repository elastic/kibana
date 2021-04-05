/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { TCPAdvancedFields } from './tcp_advanced_fields';
import { ConfigKeys } from './types';

// ensures fields and labels map appropriately
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultConfig = {
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: [],
  [ConfigKeys.REQUEST_SEND_CHECK]: '',
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: false,
};

describe('<TCPAdvancedFields />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ defaultValues = defaultConfig }) => {
    return <TCPAdvancedFields defaultValues={defaultValues} onChange={onChange} />;
  };

  it('renders TCPAdvancedFields', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    const requestPayload = getByLabelText('Request payload') as HTMLInputElement;
    const proxyURL = getByLabelText('Proxy URL') as HTMLInputElement;
    // ComboBox has an issue with associating labels with the field
    const responseContains = getByText('Check response contains');
    expect(requestPayload).toBeInTheDocument();
    expect(requestPayload.value).toEqual(defaultConfig[ConfigKeys.REQUEST_SEND_CHECK]);
    expect(proxyURL).toBeInTheDocument();
    expect(proxyURL.value).toEqual(defaultConfig[ConfigKeys.PROXY_URL]);
    expect(responseContains).toBeInTheDocument();
  });

  it('handles changing fields', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const requestPayload = getByLabelText('Request payload') as HTMLInputElement;

    fireEvent.change(requestPayload, { target: { value: 'success' } });
    expect(requestPayload.value).toEqual('success');
  });

  it('handles onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const requestPayload = getByLabelText('Request payload') as HTMLInputElement;

    fireEvent.change(requestPayload, { target: { value: 'success' } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.REQUEST_SEND_CHECK]: 'success',
        })
      );
    });
  });

  it('shows resolve hostnames locally field when proxy url is filled for tcp monitors', () => {
    const { getByLabelText, queryByLabelText } = render(<WrappedComponent />);

    expect(queryByLabelText('Resolve hostnames locally')).not.toBeInTheDocument();

    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;

    fireEvent.change(proxyUrl, { target: { value: 'sampleProxyUrl' } });

    expect(getByLabelText('Resolve hostnames locally')).toBeInTheDocument();
  });
});
