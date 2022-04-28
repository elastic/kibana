/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import React from 'react';
import { ConfigKey, DataStream, HTTPFields } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import {
  BrowserContextProvider,
  HTTPContextProvider,
  ICMPSimpleFieldsContextProvider,
  PolicyConfigContextProvider,
  TCPContextProvider,
  TLSFieldsContextProvider,
} from '../../fleet_package/contexts';
import { defaultConfig } from '../../fleet_package/synthetics_policy_create_extension';
import { MonitorFields } from './monitor_fields';

const defaultHTTPConfig = defaultConfig[DataStream.HTTP] as HTTPFields;

describe('<MonitorFields />', () => {
  const WrappedComponent = ({
    isEditable = true,
    isFormSubmitted = false,
    defaultSimpleHttpFields = defaultHTTPConfig,
  }: {
    isEditable?: boolean;
    isFormSubmitted?: boolean;
    defaultSimpleHttpFields?: HTTPFields;
  }) => {
    return (
      <HTTPContextProvider defaultValues={defaultSimpleHttpFields}>
        <PolicyConfigContextProvider isEditable={isEditable}>
          <TCPContextProvider>
            <BrowserContextProvider>
              <ICMPSimpleFieldsContextProvider>
                <TLSFieldsContextProvider>
                  <MonitorFields isFormSubmitted={isFormSubmitted} />
                </TLSFieldsContextProvider>
              </ICMPSimpleFieldsContextProvider>
            </BrowserContextProvider>
          </TCPContextProvider>
        </PolicyConfigContextProvider>
      </HTTPContextProvider>
    );
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders MonitorFields', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const monitorName = getByLabelText('URL') as HTMLInputElement;
    expect(monitorName).toBeInTheDocument();
  });

  it('only shows validation errors when field has been interacted with', async () => {
    const { getByLabelText, queryByText } = render(<WrappedComponent />);
    const monitorName = getByLabelText('Monitor name') as HTMLInputElement;
    expect(monitorName).toBeInTheDocument();

    userEvent.clear(monitorName);
    expect(queryByText('Monitor name is required')).toBeNull();
    fireEvent.blur(monitorName);
    expect(queryByText('Monitor name is required')).not.toBeNull();
  });

  it('shows all validations errors when form is submitted', async () => {
    const httpInvalidValues = { ...defaultHTTPConfig, [ConfigKey.NAME]: '', [ConfigKey.URLS]: '' };
    const { queryByText } = render(
      <WrappedComponent isFormSubmitted={true} defaultSimpleHttpFields={httpInvalidValues} />
    );

    expect(queryByText('Monitor name is required')).not.toBeNull();
    expect(queryByText('URL is required')).not.toBeNull();
  });

  it('does not show validation errors initially', async () => {
    const httpInvalidValues = { ...defaultHTTPConfig, [ConfigKey.NAME]: '', [ConfigKey.URLS]: '' };
    const { queryByText } = render(
      <WrappedComponent isFormSubmitted={false} defaultSimpleHttpFields={httpInvalidValues} />
    );

    expect(queryByText('Monitor name is required')).toBeNull();
    expect(queryByText('URL is required')).toBeNull();
  });
});
