/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import {
  TCPContextProvider,
  HTTPContextProvider,
  BrowserContextProvider,
  ICMPSimpleFieldsContextProvider,
  PolicyConfigContextProvider,
  TLSFieldsContextProvider,
} from './contexts';
import { CustomFields } from './custom_fields';
import { ConfigKeys, DataStream, ScheduleUnit } from './types';
import { validate as centralValidation } from './validation';
import { defaultConfig } from './synthetics_policy_create_extension';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

jest.mock('../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../src/plugins/kibana_react/public');
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

const defaultHTTPConfig = defaultConfig[DataStream.HTTP];
const defaultTCPConfig = defaultConfig[DataStream.TCP];

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
describe.skip('<CustomFields />', () => {
  const WrappedComponent = ({
    validate = defaultValidation,
    typeEditable = false,
    dataStreams = [DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER],
  }) => {
    return (
      <HTTPContextProvider>
        <PolicyConfigContextProvider>
          <TCPContextProvider>
            <BrowserContextProvider>
              <ICMPSimpleFieldsContextProvider>
                <TLSFieldsContextProvider>
                  <CustomFields
                    validate={validate}
                    typeEditable={typeEditable}
                    dataStreams={dataStreams}
                  />
                </TLSFieldsContextProvider>
              </ICMPSimpleFieldsContextProvider>
            </BrowserContextProvider>
          </TCPContextProvider>
        </PolicyConfigContextProvider>
      </HTTPContextProvider>
    );
  };

  it('renders CustomFields', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = queryByLabelText('Monitor Type') as HTMLInputElement;
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    expect(monitorType).not.toBeInTheDocument();
    expect(url).toBeInTheDocument();
    expect(url.value).toEqual(defaultHTTPConfig[ConfigKeys.URLS]);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultHTTPConfig[ConfigKeys.PROXY_URL]);
    expect(monitorIntervalNumber).toBeInTheDocument();
    expect(monitorIntervalNumber.value).toEqual(defaultHTTPConfig[ConfigKeys.SCHEDULE].number);
    expect(monitorIntervalUnit).toBeInTheDocument();
    expect(monitorIntervalUnit.value).toEqual(defaultHTTPConfig[ConfigKeys.SCHEDULE].unit);
    // expect(tags).toBeInTheDocument();
    expect(apmServiceName).toBeInTheDocument();
    expect(apmServiceName.value).toEqual(defaultHTTPConfig[ConfigKeys.APM_SERVICE_NAME]);
    expect(maxRedirects).toBeInTheDocument();
    expect(maxRedirects.value).toEqual(`${defaultHTTPConfig[ConfigKeys.MAX_REDIRECTS]}`);
    expect(timeout).toBeInTheDocument();
    expect(timeout.value).toEqual(`${defaultHTTPConfig[ConfigKeys.TIMEOUT]}`);

    // ensure other monitor type options are not in the DOM
    expect(queryByLabelText('Host')).not.toBeInTheDocument();
    expect(queryByLabelText('Wait in seconds')).not.toBeInTheDocument();

    // ensure at least one http advanced option is present
    const advancedOptionsButton = getByText('Advanced HTTP options');
    fireEvent.click(advancedOptionsButton);
    await waitFor(() => {
      expect(getByLabelText('Request method')).toBeInTheDocument();
    });
  });

  it('shows SSL fields when Enable SSL Fields is checked', async () => {
    const { findByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const enableSSL = queryByLabelText('Enable TLS configuration') as HTMLInputElement;
    expect(queryByLabelText('Certificate authorities')).not.toBeInTheDocument();
    expect(queryByLabelText('Client key')).not.toBeInTheDocument();
    expect(queryByLabelText('Client certificate')).not.toBeInTheDocument();
    expect(queryByLabelText('Client key passphrase')).not.toBeInTheDocument();
    expect(queryByLabelText('Verification mode')).not.toBeInTheDocument();

    // ensure at least one http advanced option is present
    fireEvent.click(enableSSL);

    const ca = (await findByLabelText('Certificate authorities')) as HTMLInputElement;
    const clientKey = (await findByLabelText('Client key')) as HTMLInputElement;
    const clientKeyPassphrase = (await findByLabelText(
      'Client key passphrase'
    )) as HTMLInputElement;
    const clientCertificate = (await findByLabelText('Client certificate')) as HTMLInputElement;
    const verificationMode = (await findByLabelText('Verification mode')) as HTMLInputElement;
    expect(ca).toBeInTheDocument();
    expect(clientKey).toBeInTheDocument();
    expect(clientKeyPassphrase).toBeInTheDocument();
    expect(clientCertificate).toBeInTheDocument();
    expect(verificationMode).toBeInTheDocument();

    await waitFor(() => {
      expect(ca.value).toEqual(defaultHTTPConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]);
      expect(clientKey.value).toEqual(defaultHTTPConfig[ConfigKeys.TLS_KEY]);
      expect(clientKeyPassphrase.value).toEqual(defaultHTTPConfig[ConfigKeys.TLS_KEY_PASSPHRASE]);
      expect(clientCertificate.value).toEqual(defaultHTTPConfig[ConfigKeys.TLS_CERTIFICATE]);
      expect(verificationMode.value).toEqual(defaultHTTPConfig[ConfigKeys.TLS_VERIFICATION_MODE]);
    });
  });

  it('handles updating each field (besides TLS)', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;

    fireEvent.change(url, { target: { value: 'http://elastic.co' } });
    fireEvent.change(proxyUrl, { target: { value: 'http://proxy.co' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } });
    fireEvent.change(monitorIntervalUnit, { target: { value: ScheduleUnit.MINUTES } });
    fireEvent.change(apmServiceName, { target: { value: 'APM Service' } });
    fireEvent.change(maxRedirects, { target: { value: '2' } });
    fireEvent.change(timeout, { target: { value: '3' } });

    expect(url.value).toEqual('http://elastic.co');
    expect(proxyUrl.value).toEqual('http://proxy.co');
    expect(monitorIntervalNumber.value).toEqual('1');
    expect(monitorIntervalUnit.value).toEqual(ScheduleUnit.MINUTES);
    expect(apmServiceName.value).toEqual('APM Service');
    expect(maxRedirects.value).toEqual('2');
    expect(timeout.value).toEqual('3');
  });

  it('handles switching monitor type', () => {
    const { getByText, getByLabelText, queryByLabelText, getAllByLabelText } = render(
      <WrappedComponent typeEditable />
    );
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultHTTPConfig[ConfigKeys.MONITOR_TYPE]);
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    // expect tcp fields to be in the DOM
    const host = getByLabelText('Host:Port') as HTMLInputElement;

    expect(host).toBeInTheDocument();
    expect(host.value).toEqual(defaultTCPConfig[ConfigKeys.HOSTS]);

    // expect HTTP fields not to be in the DOM
    expect(queryByLabelText('URL')).not.toBeInTheDocument();
    expect(queryByLabelText('Max redirects')).not.toBeInTheDocument();

    // expect tls options to be available for TCP
    expect(queryByLabelText('Enable TLS configuration')).toBeInTheDocument();

    // ensure at least one tcp advanced option is present
    let advancedOptionsButton = getByText('Advanced TCP options');
    fireEvent.click(advancedOptionsButton);

    expect(queryByLabelText('Request method')).not.toBeInTheDocument();
    expect(getByLabelText('Request payload')).toBeInTheDocument();

    fireEvent.change(monitorType, { target: { value: DataStream.ICMP } });

    // expect ICMP fields to be in the DOM
    expect(getByLabelText('Wait in seconds')).toBeInTheDocument();

    // expect tls options not be available for ICMP
    expect(queryByLabelText('Enable TLS configuration')).not.toBeInTheDocument();

    // expect TCP fields not to be in the DOM
    expect(queryByLabelText('Proxy URL')).not.toBeInTheDocument();

    fireEvent.change(monitorType, { target: { value: DataStream.BROWSER } });

    // expect browser fields to be in the DOM
    getAllByLabelText('Zip URL').forEach((node) => {
      expect(node).toBeInTheDocument();
    });
    expect(
      getByText(
        /To create a "Browser" monitor, please ensure you are using the elastic-agent-complete Docker container, which contains the dependencies to run these mon/
      )
    ).toBeInTheDocument();

    // expect tls options to be available for browser
    expect(queryByLabelText('Zip Proxy URL')).toBeInTheDocument();
    expect(queryByLabelText('Enable TLS configuration for Zip URL')).toBeInTheDocument();

    // ensure at least one browser advanced option is present
    advancedOptionsButton = getByText('Advanced Browser options');
    fireEvent.click(advancedOptionsButton);
    expect(getByLabelText('Screenshot options')).toBeInTheDocument();

    // expect ICMP fields not to be in the DOM
    expect(queryByLabelText('Wait in seconds')).not.toBeInTheDocument();
  });

  it('shows resolve hostnames locally field when proxy url is filled for tcp monitors', () => {
    const { getByLabelText, queryByLabelText } = render(<WrappedComponent typeEditable />);
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    expect(queryByLabelText('Resolve hostnames locally')).not.toBeInTheDocument();

    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;

    fireEvent.change(proxyUrl, { target: { value: 'sampleProxyUrl' } });

    expect(getByLabelText('Resolve hostnames locally')).toBeInTheDocument();
  });

  it('handles validation', () => {
    const { getByText, getByLabelText, queryByText } = render(<WrappedComponent />);

    const url = getByLabelText('URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;

    // create errors
    fireEvent.change(monitorIntervalNumber, { target: { value: '-1' } });
    fireEvent.change(maxRedirects, { target: { value: '-1' } });
    fireEvent.change(timeout, { target: { value: '-1' } });

    const urlError = getByText('URL is required');
    const monitorIntervalError = getByText('Monitor interval is required');
    const maxRedirectsError = getByText('Max redirects must be 0 or greater');
    const timeoutError = getByText('Timeout must be greater than or equal to 0');

    expect(urlError).toBeInTheDocument();
    expect(monitorIntervalError).toBeInTheDocument();
    expect(maxRedirectsError).toBeInTheDocument();
    expect(timeoutError).toBeInTheDocument();

    // resolve errors
    fireEvent.change(url, { target: { value: 'http://elastic.co' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } });
    fireEvent.change(maxRedirects, { target: { value: '1' } });
    fireEvent.change(timeout, { target: { value: '1' } });

    expect(queryByText('URL is required')).not.toBeInTheDocument();
    expect(queryByText('Monitor interval is required')).not.toBeInTheDocument();
    expect(queryByText('Max redirects must be 0 or greater')).not.toBeInTheDocument();
    expect(queryByText('Timeout must be greater than or equal to 0')).not.toBeInTheDocument();

    // create more errors
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } }); // 1 minute
    fireEvent.change(timeout, { target: { value: '611' } }); // timeout cannot be more than monitor interval

    const timeoutError2 = getByText('Timeout must be less than the monitor interval');

    expect(timeoutError2).toBeInTheDocument();
  });

  it('does not show monitor options that are not contained in datastreams', async () => {
    const { getByText, queryByText, queryByLabelText } = render(
      <WrappedComponent
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP]}
        typeEditable
      />
    );

    const monitorType = queryByLabelText('Monitor Type') as HTMLInputElement;

    // resolve errors
    fireEvent.click(monitorType);

    await waitFor(() => {
      expect(getByText('HTTP')).toBeInTheDocument();
      expect(getByText('TCP')).toBeInTheDocument();
      expect(getByText('ICMP')).toBeInTheDocument();
      expect(queryByText('Browser')).not.toBeInTheDocument();
    });
  });
});
