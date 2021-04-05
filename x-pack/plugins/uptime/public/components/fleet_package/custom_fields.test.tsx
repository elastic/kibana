/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { defaultConfig } from './synthetics_policy_create_extension';
import { CustomFields } from './custom_fields';
import { ConfigKeys, DataStream, ScheduleUnit, VerificationMode } from './types';
import { validate as centralValidation } from './validation';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultValidation = centralValidation[DataStream.HTTP];

describe('<CustomFields />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({
    defaultValues = defaultConfig,
    validate = defaultValidation,
    typeEditable = false,
  }) => {
    return (
      <CustomFields
        defaultValues={defaultValues}
        onChange={onChange}
        validate={validate}
        typeEditable={typeEditable}
      />
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
    expect(url.value).toEqual(defaultConfig[ConfigKeys.URLS]);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultConfig[ConfigKeys.PROXY_URL]);
    expect(monitorIntervalNumber).toBeInTheDocument();
    expect(monitorIntervalNumber.value).toEqual(defaultConfig[ConfigKeys.SCHEDULE].number);
    expect(monitorIntervalUnit).toBeInTheDocument();
    expect(monitorIntervalUnit.value).toEqual(defaultConfig[ConfigKeys.SCHEDULE].unit);
    // expect(tags).toBeInTheDocument();
    expect(apmServiceName).toBeInTheDocument();
    expect(apmServiceName.value).toEqual(defaultConfig[ConfigKeys.APM_SERVICE_NAME]);
    expect(maxRedirects).toBeInTheDocument();
    expect(maxRedirects.value).toEqual(`${defaultConfig[ConfigKeys.MAX_REDIRECTS]}`);
    expect(timeout).toBeInTheDocument();
    expect(timeout.value).toEqual(`${defaultConfig[ConfigKeys.TIMEOUT]}`);

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

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
            value: defaultConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value,
            isEnabled: false,
          },
          [ConfigKeys.TLS_CERTIFICATE]: {
            value: defaultConfig[ConfigKeys.TLS_CERTIFICATE].value,
            isEnabled: false,
          },
          [ConfigKeys.TLS_KEY]: {
            value: defaultConfig[ConfigKeys.TLS_KEY].value,
            isEnabled: false,
          },
          [ConfigKeys.TLS_KEY_PASSPHRASE]: {
            value: defaultConfig[ConfigKeys.TLS_KEY_PASSPHRASE].value,
            isEnabled: false,
          },
          [ConfigKeys.TLS_VERIFICATION_MODE]: {
            value: defaultConfig[ConfigKeys.TLS_VERIFICATION_MODE].value,
            isEnabled: false,
          },
        })
      );
    });

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
      expect(ca.value).toEqual(defaultConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value);
      expect(clientKey.value).toEqual(defaultConfig[ConfigKeys.TLS_KEY].value);
      expect(clientKeyPassphrase.value).toEqual(defaultConfig[ConfigKeys.TLS_KEY_PASSPHRASE].value);
      expect(clientCertificate.value).toEqual(defaultConfig[ConfigKeys.TLS_CERTIFICATE].value);
      expect(verificationMode.value).toEqual(defaultConfig[ConfigKeys.TLS_VERIFICATION_MODE].value);
    });

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
            value: defaultConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value,
            isEnabled: true,
          },
          [ConfigKeys.TLS_CERTIFICATE]: {
            value: defaultConfig[ConfigKeys.TLS_CERTIFICATE].value,
            isEnabled: true,
          },
          [ConfigKeys.TLS_KEY]: {
            value: defaultConfig[ConfigKeys.TLS_KEY].value,
            isEnabled: true,
          },
          [ConfigKeys.TLS_KEY_PASSPHRASE]: {
            value: defaultConfig[ConfigKeys.TLS_KEY_PASSPHRASE].value,
            isEnabled: true,
          },
          [ConfigKeys.TLS_VERIFICATION_MODE]: {
            value: defaultConfig[ConfigKeys.TLS_VERIFICATION_MODE].value,
            isEnabled: true,
          },
        })
      );
    });
  });

  it('handles changing TLS fields', async () => {
    const { findByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const enableSSL = queryByLabelText('Enable TLS configuration') as HTMLInputElement;
    // ensure at least one http advanced option is present
    fireEvent.click(enableSSL);

    const ca = (await findByLabelText('Certificate authorities')) as HTMLInputElement;
    const clientKey = (await findByLabelText('Client key')) as HTMLInputElement;
    const clientKeyPassphrase = (await findByLabelText(
      'Client key passphrase'
    )) as HTMLInputElement;
    const clientCertificate = (await findByLabelText('Client certificate')) as HTMLInputElement;
    const verificationMode = (await findByLabelText('Verification mode')) as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(ca, { target: { value: 'certificateAuthorities' } });
      expect(ca.value).toEqual(defaultConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value);
    });
    await waitFor(() => {
      fireEvent.change(clientCertificate, { target: { value: 'clientCertificate' } });
      expect(clientCertificate.value).toEqual(defaultConfig[ConfigKeys.TLS_KEY].value);
    });
    await waitFor(() => {
      fireEvent.change(clientKey, { target: { value: 'clientKey' } });
      expect(clientKey.value).toEqual(defaultConfig[ConfigKeys.TLS_KEY].value);
    });
    await waitFor(() => {
      fireEvent.change(clientKeyPassphrase, { target: { value: 'clientKeyPassphrase' } });
      expect(clientKeyPassphrase.value).toEqual(defaultConfig[ConfigKeys.TLS_KEY_PASSPHRASE].value);
    });
    await waitFor(() => {
      fireEvent.change(verificationMode, { target: { value: VerificationMode.NONE } });
      expect(verificationMode.value).toEqual(defaultConfig[ConfigKeys.TLS_VERIFICATION_MODE].value);
    });

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
            value: 'certificateAuthorities',
            isEnabled: true,
          },
          [ConfigKeys.TLS_CERTIFICATE]: {
            value: 'clientCertificate',
            isEnabled: true,
          },
          [ConfigKeys.TLS_KEY]: {
            value: 'clientKey',
            isEnabled: true,
          },
          [ConfigKeys.TLS_KEY_PASSPHRASE]: {
            value: 'clientKeyPassphrase',
            isEnabled: true,
          },
          [ConfigKeys.TLS_VERIFICATION_MODE]: {
            value: VerificationMode.NONE,
            isEnabled: true,
          },
        })
      );
    });
  }, 10000); // runs slow because of multiple useDebounce

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

  it('handles calling onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const url = getByLabelText('URL') as HTMLInputElement;

    fireEvent.change(url, { target: { value: 'http://elastic.co' } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          [ConfigKeys.URLS]: 'http://elastic.co',
        })
      );
    });
  });

  it('handles switching monitor type', () => {
    const { getByText, getByLabelText, queryByLabelText } = render(
      <WrappedComponent typeEditable />
    );
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultConfig[ConfigKeys.MONITOR_TYPE]);
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    // expect tcp fields to be in the DOM
    const host = getByLabelText('Host') as HTMLInputElement;

    expect(host).toBeInTheDocument();
    expect(host.value).toEqual(defaultConfig[ConfigKeys.HOSTS]);

    // expect HTTP fields not to be in the DOM
    expect(queryByLabelText('URL')).not.toBeInTheDocument();
    expect(queryByLabelText('Max redirects')).not.toBeInTheDocument();

    // ensure at least one tcp advanced option is present
    const advancedOptionsButton = getByText('Advanced TCP options');
    fireEvent.click(advancedOptionsButton);

    expect(queryByLabelText('Request method')).not.toBeInTheDocument();
    expect(getByLabelText('Request payload')).toBeInTheDocument();

    fireEvent.change(monitorType, { target: { value: DataStream.ICMP } });

    // expect ICMP fields to be in the DOM
    expect(getByLabelText('Wait in seconds')).toBeInTheDocument();

    // expect TCP fields not to be in the DOM
    expect(queryByLabelText('Proxy URL')).not.toBeInTheDocument();
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
    const timeoutError = getByText('Timeout must be 0 or greater');

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
    expect(queryByText('Timeout must be 0 or greater')).not.toBeInTheDocument();
  });
});
