/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import React from 'react';
import {
  ConfigKey,
  DataStream,
  HTTPFields,
  BrowserFields,
  SourceType,
} from '../../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import {
  BrowserContextProvider,
  HTTPContextProvider,
  ICMPSimpleFieldsContextProvider,
  PolicyConfigContextProvider,
  TCPContextProvider,
  TLSFieldsContextProvider,
} from '../../fleet_package/contexts';
import { DEFAULT_FIELDS } from '../../../../../common/constants/monitor_defaults';
import { MonitorFields } from './monitor_fields';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
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

const defaultHTTPConfig = DEFAULT_FIELDS[DataStream.HTTP] as HTTPFields;
const defaultBrowserConfig = DEFAULT_FIELDS[DataStream.BROWSER];

describe('<MonitorFields />', () => {
  const WrappedComponent = ({
    isEditable = true,
    isFormSubmitted = false,
    defaultSimpleHttpFields = defaultHTTPConfig,
    defaultBrowserFields = defaultBrowserConfig,
    readOnly = false,
  }: {
    isEditable?: boolean;
    isFormSubmitted?: boolean;
    defaultSimpleHttpFields?: HTTPFields;
    defaultBrowserFields?: BrowserFields;
    readOnly?: boolean;
  }) => {
    return (
      <HTTPContextProvider defaultValues={defaultSimpleHttpFields}>
        <PolicyConfigContextProvider
          isEditable={isEditable}
          sourceType={readOnly ? SourceType.PROJECT : SourceType.UI}
        >
          <TCPContextProvider>
            <BrowserContextProvider defaultValues={defaultBrowserFields}>
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

  it('is reradonly when source type is project', async () => {
    const name = 'monitor name';
    const browserFields = {
      ...defaultBrowserConfig,
      [ConfigKey.NAME]: name,
    };
    const { getByText } = render(
      <WrappedComponent
        isFormSubmitted={false}
        defaultBrowserFields={browserFields}
        readOnly={true}
      />
    );

    expect(getByText('Read only')).toBeInTheDocument();
  });
});
