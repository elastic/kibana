/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import {
  BrowserContextProvider,
  HTTPContextProvider,
  ICMPSimpleFieldsContextProvider,
  PolicyConfigContextProvider,
  TCPContextProvider,
  TLSFieldsContextProvider,
} from '../../fleet_package/contexts';
import { MonitorConfig } from './monitor_config';

describe('<MonitorConfig />', () => {
  const WrappedComponent = ({ isEditable = true, isEdit = false }) => {
    return (
      <HTTPContextProvider>
        <PolicyConfigContextProvider isEditable={isEditable}>
          <TCPContextProvider>
            <BrowserContextProvider>
              <ICMPSimpleFieldsContextProvider>
                <TLSFieldsContextProvider>
                  <MonitorConfig isEdit={isEdit} />
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

  it('renders MonitorConfig', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const monitorName = getByLabelText('Monitor name') as HTMLInputElement;
    expect(monitorName).toBeInTheDocument();
  });

  it('only shows validation errors when field is interacted with', async () => {
    const { getByLabelText, queryByText } = render(<WrappedComponent />);
    const monitorName = getByLabelText('Monitor name') as HTMLInputElement;
    expect(monitorName).toBeInTheDocument();

    userEvent.clear(monitorName);
    expect(queryByText('Monitor name is required')).toBeNull();
    fireEvent.blur(monitorName);
    expect(queryByText('Monitor name is required')).not.toBeNull();
  });
});
