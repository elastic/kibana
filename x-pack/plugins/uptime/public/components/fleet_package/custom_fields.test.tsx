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
import { ConfigKey, DataStream, ScheduleUnit } from './types';
import { validate as centralValidation } from './validation';
import { defaultConfig } from './synthetics_policy_create_extension';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
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

describe('<CustomFields />', () => {
  let onFieldBlurMock: jest.Mock | undefined;

  const WrappedComponent = ({
    validate = defaultValidation,
    isEditable = false,
    dataStreams = [DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER],
    onFieldBlur = onFieldBlurMock,
  }) => {
    return (
      <HTTPContextProvider>
        <PolicyConfigContextProvider isEditable={isEditable}>
          <TCPContextProvider>
            <BrowserContextProvider>
              <ICMPSimpleFieldsContextProvider>
                <TLSFieldsContextProvider>
                  <CustomFields
                    validate={validate}
                    dataStreams={dataStreams}
                    onFieldBlur={onFieldBlur}
                  />
                </TLSFieldsContextProvider>
              </ICMPSimpleFieldsContextProvider>
            </BrowserContextProvider>
          </TCPContextProvider>
        </PolicyConfigContextProvider>
      </HTTPContextProvider>
    );
  };

  beforeEach(() => {
    onFieldBlurMock = undefined;
    jest.resetAllMocks();
  });

  it('renders CustomFields', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(
      <WrappedComponent onFieldBlur={undefined} />
    );
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(url).toBeInTheDocument();
    expect(url.value).toEqual(defaultHTTPConfig[ConfigKey.URLS]);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultHTTPConfig[ConfigKey.PROXY_URL]);
    expect(monitorIntervalNumber).toBeInTheDocument();
    expect(monitorIntervalNumber.value).toEqual(defaultHTTPConfig[ConfigKey.SCHEDULE].number);
    expect(monitorIntervalUnit).toBeInTheDocument();
    expect(monitorIntervalUnit.value).toEqual(defaultHTTPConfig[ConfigKey.SCHEDULE].unit);
    // expect(tags).toBeInTheDocument();
    expect(apmServiceName).toBeInTheDocument();
    expect(apmServiceName.value).toEqual(defaultHTTPConfig[ConfigKey.APM_SERVICE_NAME]);
    expect(maxRedirects).toBeInTheDocument();
    expect(maxRedirects.value).toEqual(`${defaultHTTPConfig[ConfigKey.MAX_REDIRECTS]}`);
    expect(timeout).toBeInTheDocument();
    expect(timeout.value).toEqual(`${defaultHTTPConfig[ConfigKey.TIMEOUT]}`);

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

  it('does not show monitor type dropdown when isEditable is true', async () => {
    const { queryByLabelText } = render(<WrappedComponent isEditable />);
    const monitorType = queryByLabelText('Monitor Type') as HTMLInputElement;

    expect(monitorType).not.toBeInTheDocument();
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
      expect(ca.value).toEqual(defaultHTTPConfig[ConfigKey.TLS_CERTIFICATE_AUTHORITIES]);
      expect(clientKey.value).toEqual(defaultHTTPConfig[ConfigKey.TLS_KEY]);
      expect(clientKeyPassphrase.value).toEqual(defaultHTTPConfig[ConfigKey.TLS_KEY_PASSPHRASE]);
      expect(clientCertificate.value).toEqual(defaultHTTPConfig[ConfigKey.TLS_CERTIFICATE]);
      expect(verificationMode.value).toEqual(defaultHTTPConfig[ConfigKey.TLS_VERIFICATION_MODE]);
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
    const { getByText, queryByText, getByLabelText, queryByLabelText, getAllByLabelText } = render(
      <WrappedComponent />
    );
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultHTTPConfig[ConfigKey.MONITOR_TYPE]);
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    // expect tcp fields to be in the DOM
    const host = getByLabelText('Host:Port') as HTMLInputElement;

    expect(host).toBeInTheDocument();
    expect(host.value).toEqual(defaultTCPConfig[ConfigKey.HOSTS]);

    // expect HTTP fields not to be in the DOM
    expect(queryByLabelText('URL')).not.toBeInTheDocument();
    expect(queryByLabelText('Max redirects')).not.toBeInTheDocument();

    // expect tls options to be available for TCP
    // here we must getByText because EUI will generate duplicate aria-labelledby
    // values within the test-env generator used, and that will conflict with other
    // automatically generated labels. See:
    // https://github.com/elastic/eui/blob/91b416dcd51e116edb2cb4a2cac4c306512e28c7/src/services/accessibility/html_id_generator.testenv.ts#L12
    expect(queryByText(/Enable TLS configuration/)).toBeInTheDocument();

    // ensure at least one tcp advanced option is present
    let advancedOptionsButton = getByText('Advanced TCP options');
    fireEvent.click(advancedOptionsButton);

    expect(queryByLabelText('Request method')).not.toBeInTheDocument();
    expect(getByLabelText('Request payload')).toBeInTheDocument();

    fireEvent.change(monitorType, { target: { value: DataStream.ICMP } });

    // expect ICMP fields to be in the DOM
    expect(getByLabelText('Wait in seconds')).toBeInTheDocument();

    // expect tls options not to be available for ICMP
    expect(queryByText(/Enable TLS configuration/)).not.toBeInTheDocument();

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
    expect(queryByLabelText('Proxy Zip URL')).toBeInTheDocument();
    expect(queryByText(/Enable TLS configuration for Zip URL/)).toBeInTheDocument();

    // ensure at least one browser advanced option is present
    advancedOptionsButton = getByText('Advanced Browser options');
    fireEvent.click(advancedOptionsButton);
    expect(getByLabelText('Screenshot options')).toBeInTheDocument();

    // expect ICMP fields not to be in the DOM
    expect(queryByLabelText('Wait in seconds')).not.toBeInTheDocument();
  });

  it('does not show timeout for browser monitors', () => {
    const { getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    let timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultHTTPConfig[ConfigKey.MONITOR_TYPE]);
    expect(timeout.value).toEqual(defaultHTTPConfig[ConfigKey.TIMEOUT]);

    // change to browser monitor
    fireEvent.change(monitorType, { target: { value: DataStream.BROWSER } });

    // expect timeout not to be in the DOM
    expect(queryByLabelText('Timeout in seconds')).not.toBeInTheDocument();

    // change back to HTTP
    fireEvent.change(monitorType, { target: { value: DataStream.HTTP } });

    // expect timeout value to be present with the correct value
    timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    expect(timeout.value).toEqual(defaultHTTPConfig[ConfigKey.TIMEOUT]);
  });

  it('shows resolve hostnames locally field when proxy url is filled for tcp monitors', () => {
    const { getByLabelText, queryByLabelText } = render(<WrappedComponent />);
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
    const monitorIntervalError = getByText('Monitor frequency is required');
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
    expect(queryByText('Monitor frequency is required')).not.toBeInTheDocument();
    expect(queryByText('Max redirects must be 0 or greater')).not.toBeInTheDocument();
    expect(queryByText('Timeout must be greater than or equal to 0')).not.toBeInTheDocument();

    // create more errors
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } }); // 1 minute
    fireEvent.change(timeout, { target: { value: '611' } }); // timeout cannot be more than monitor interval

    const timeoutError2 = getByText('Timeout must be less than the monitor frequency');

    expect(timeoutError2).toBeInTheDocument();
  });

  it('does not show monitor options that are not contained in datastreams', async () => {
    const { getByText, queryByText, queryByLabelText } = render(
      <WrappedComponent dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP]} />
    );

    const monitorType = queryByLabelText('Monitor Type') as HTMLInputElement;

    // resolve errors
    fireEvent.click(monitorType);

    await waitFor(() => {
      expect(getByText('HTTP')).toBeInTheDocument();
      expect(getByText('TCP')).toBeInTheDocument();
      expect(getByText('ICMP')).toBeInTheDocument();
      expect(queryByText('Browser (Beta)')).not.toBeInTheDocument();
    });
  });

  it('allows monitors to be disabled', async () => {
    const { queryByLabelText } = render(
      <WrappedComponent dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP]} />
    );

    const enabled = queryByLabelText('Enabled') as HTMLInputElement;
    expect(enabled).toBeChecked();

    fireEvent.click(enabled);

    await waitFor(() => {
      expect(enabled).not.toBeChecked();
    });
  });

  it('calls onFieldBlur on fields', () => {
    onFieldBlurMock = jest.fn();
    const { queryByLabelText } = render(
      <WrappedComponent
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP]}
        onFieldBlur={onFieldBlurMock}
      />
    );

    const monitorTypeSelect = queryByLabelText('Monitor Type') as HTMLInputElement;
    fireEvent.click(monitorTypeSelect);
    fireEvent.blur(monitorTypeSelect);
    expect(onFieldBlurMock).toHaveBeenCalledWith(ConfigKey.MONITOR_TYPE);
  });
});
