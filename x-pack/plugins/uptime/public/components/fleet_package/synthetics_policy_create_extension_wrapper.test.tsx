/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { NewPackagePolicy } from '../../../../fleet/public';
import {
  defaultSimpleFields,
  defaultTLSFields,
  defaultHTTPAdvancedFields,
  defaultTCPAdvancedFields,
} from './contexts';
import { SyntheticsPolicyCreateExtensionWrapper } from './synthetics_policy_create_extension_wrapper';
import { ConfigKeys, DataStream, ScheduleUnit, VerificationMode } from './types';

const defaultConfig = {
  ...defaultSimpleFields,
  ...defaultTLSFields,
  ...defaultHTTPAdvancedFields,
  ...defaultTCPAdvancedFields,
};

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultNewPolicy: NewPackagePolicy = {
  name: 'samplePolicyName',
  description: '',
  namespace: 'default',
  policy_id: 'ae774160-8e49-11eb-aba5-99269d21ba6e',
  enabled: true,
  output_id: '',
  inputs: [
    {
      type: 'synthetics/http',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'http',
          },
          vars: {
            type: {
              value: 'http',
              type: 'text',
            },
            name: {
              value: 'Sample name',
              type: 'text',
            },
            schedule: {
              value: '"@every 5s"',
              type: 'text',
            },
            urls: {
              value: '',
              type: 'text',
            },
            'service.name': {
              value: '',
              type: 'text',
            },
            timeout: {
              value: '16s',
              type: 'text',
            },
            max_redirects: {
              value: 0,
              type: 'integer',
            },
            proxy_url: {
              value: '',
              type: 'text',
            },
            tags: {
              value: '[]',
              type: 'yaml',
            },
            'response.include_headers': {
              value: true,
              type: 'bool',
            },
            'response.include_body': {
              value: 'on_error',
              type: 'text',
            },
            'check.request.method': {
              value: 'GET',
              type: 'text',
            },
            'check.request.headers': {
              value: '{}',
              type: 'yaml',
            },
            'check.request.body': {
              value: '""',
              type: 'yaml',
            },
            'check.response.status': {
              value: '[]',
              type: 'yaml',
            },
            'check.response.headers': {
              value: '{}',
              type: 'yaml',
            },
            'check.response.body.positive': {
              value: '[]',
              type: 'yaml',
            },
            'check.response.body.negative': {
              value: '[]',
              type: 'yaml',
            },
            'ssl.certificate_authorities': {
              value: '',
              type: 'yaml',
            },
            'ssl.certificate': {
              value: '',
              type: 'yaml',
            },
            'ssl.key': {
              value: '',
              type: 'yaml',
            },
            'ssl.key_passphrase': {
              type: 'text',
            },
            'ssl.verification_mode': {
              value: 'full',
              type: 'text',
            },
          },
        },
      ],
    },
    {
      type: 'synthetics/tcp',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'tcp',
          },
          vars: {
            type: {
              value: 'tcp',
              type: 'text',
            },
            name: {
              type: 'text',
            },
            schedule: {
              value: '10s',
              type: 'text',
            },
            hosts: {
              type: 'text',
            },
            'service.name': {
              type: 'text',
            },
            timeout: {
              type: 'text',
            },
            max_redirects: {
              type: 'integer',
            },
            proxy_url: {
              type: 'text',
            },
            proxy_use_local_resolver: {
              value: false,
              type: 'bool',
            },
            tags: {
              type: 'yaml',
            },
            'check.send': {
              type: 'text',
            },
            'check.receive': {
              type: 'yaml',
            },
            'ssl.certificate_authorities': {
              type: 'yaml',
            },
            'ssl.certificate': {
              type: 'yaml',
            },
            'ssl.key': {
              type: 'yaml',
            },
            'ssl.key_passphrase': {
              type: 'text',
            },
            'ssl.verification_mode': {
              type: 'text',
            },
          },
        },
      ],
    },
    {
      type: 'synthetics/icmp',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'icmp',
          },
          vars: {
            type: {
              value: 'icmp',
              type: 'text',
            },
            name: {
              type: 'text',
            },
            schedule: {
              value: '10s',
              type: 'text',
            },
            wait: {
              value: '1s',
              type: 'text',
            },
            hosts: {
              type: 'text',
            },
            'service.name': {
              type: 'text',
            },
            timeout: {
              type: 'text',
            },
            max_redirects: {
              type: 'integer',
            },
            tags: {
              type: 'yaml',
            },
          },
        },
      ],
    },
  ],
  package: {
    name: 'synthetics',
    title: 'Elastic Synthetics',
    version: '0.66.0',
  },
};

describe('<SyntheticsPolicyCreateExtension />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ newPolicy = defaultNewPolicy }) => {
    return <SyntheticsPolicyCreateExtensionWrapper newPolicy={newPolicy} onChange={onChange} />;
  };

  it('renders SyntheticsPolicyCreateExtension', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = queryByLabelText('Monitor Type') as HTMLInputElement;
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultConfig[ConfigKeys.MONITOR_TYPE]);
    expect(url).toBeInTheDocument();
    expect(url.value).toEqual(defaultConfig[ConfigKeys.URLS]);
    expect(proxyUrl).toBeInTheDocument();
    expect(proxyUrl.value).toEqual(defaultConfig[ConfigKeys.PROXY_URL]);
    expect(monitorIntervalNumber).toBeInTheDocument();
    expect(monitorIntervalNumber.value).toEqual(defaultConfig[ConfigKeys.SCHEDULE].number);
    expect(monitorIntervalUnit).toBeInTheDocument();
    expect(monitorIntervalUnit.value).toEqual(defaultConfig[ConfigKeys.SCHEDULE].unit);
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

  it('handles updating fields', async () => {
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

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        isValid: true,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              streams: [
                {
                  ...defaultNewPolicy.inputs[0].streams[0],
                  vars: {
                    ...defaultNewPolicy.inputs[0].streams[0].vars,
                    urls: {
                      value: 'http://elastic.co',
                      type: 'text',
                    },
                    proxy_url: {
                      value: 'http://proxy.co',
                      type: 'text',
                    },
                    schedule: {
                      value: '"@every 1m"',
                      type: 'text',
                    },
                    'service.name': {
                      value: 'APM Service',
                      type: 'text',
                    },
                    max_redirects: {
                      value: '2',
                      type: 'integer',
                    },
                    timeout: {
                      value: '3s',
                      type: 'text',
                    },
                  },
                },
              ],
            },
            defaultNewPolicy.inputs[1],
            defaultNewPolicy.inputs[2],
          ],
        },
      });
    });
  });

  it('handles calling onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const url = getByLabelText('URL') as HTMLInputElement;

    fireEvent.change(url, { target: { value: 'http://elastic.co' } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        isValid: true,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              streams: [
                {
                  ...defaultNewPolicy.inputs[0].streams[0],
                  vars: {
                    ...defaultNewPolicy.inputs[0].streams[0].vars,
                    urls: {
                      value: 'http://elastic.co',
                      type: 'text',
                    },
                  },
                },
              ],
            },
            defaultNewPolicy.inputs[1],
            defaultNewPolicy.inputs[2],
          ],
        },
      });
    });
  });

  it('handles switching monitor type', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    expect(monitorType).toBeInTheDocument();
    expect(monitorType.value).toEqual(defaultConfig[ConfigKeys.MONITOR_TYPE]);
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              enabled: false,
            },
            {
              ...defaultNewPolicy.inputs[1],
              enabled: true,
            },
            defaultNewPolicy.inputs[2],
          ],
        },
      });
    });

    // expect tcp fields to be in the DOM
    const host = getByLabelText('Host:Port') as HTMLInputElement;

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

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              enabled: false,
            },
            {
              ...defaultNewPolicy.inputs[1],
              enabled: false,
            },
            {
              ...defaultNewPolicy.inputs[2],
              enabled: true,
            },
          ],
        },
      });
    });

    // expect ICMP fields to be in the DOM
    expect(getByLabelText('Wait in seconds')).toBeInTheDocument();

    // expect TCP fields not to be in the DOM
    expect(queryByLabelText('Proxy URL')).not.toBeInTheDocument();
  });

  it('handles http validation', async () => {
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
    const timeoutError = getByText('Timeout must be 0 or greater and less than schedule interval');

    expect(urlError).toBeInTheDocument();
    expect(monitorIntervalError).toBeInTheDocument();
    expect(maxRedirectsError).toBeInTheDocument();
    expect(timeoutError).toBeInTheDocument();

    // expect onChange to be called with isValid false
    await waitFor(() => {
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: false,
        })
      );
    });

    // resolve errors
    fireEvent.change(url, { target: { value: 'http://elastic.co' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } });
    fireEvent.change(maxRedirects, { target: { value: '1' } });
    fireEvent.change(timeout, { target: { value: '1' } });

    // expect onChange to be called with isValid true
    await waitFor(() => {
      expect(queryByText('URL is required')).not.toBeInTheDocument();
      expect(queryByText('Monitor interval is required')).not.toBeInTheDocument();
      expect(queryByText('Max redirects must be 0 or greater')).not.toBeInTheDocument();
      expect(
        queryByText('Timeout must be 0 or greater and less than schedule interval')
      ).not.toBeInTheDocument();
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: true,
        })
      );
    });
  });

  it('handles tcp validation', async () => {
    const { getByText, getByLabelText, queryByText } = render(<WrappedComponent />);

    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    const host = getByLabelText('Host:Port') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;

    // create errors
    fireEvent.change(host, { target: { value: 'localhost' } }); // host without port
    fireEvent.change(monitorIntervalNumber, { target: { value: '-1' } });
    fireEvent.change(timeout, { target: { value: '-1' } });

    await waitFor(() => {
      const hostError = getByText('Host and port are required');
      const monitorIntervalError = getByText('Monitor interval is required');
      const timeoutError = getByText(
        'Timeout must be 0 or greater and less than schedule interval'
      );

      expect(hostError).toBeInTheDocument();
      expect(monitorIntervalError).toBeInTheDocument();
      expect(timeoutError).toBeInTheDocument();
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: false,
        })
      );
    });

    // resolve errors
    fireEvent.change(host, { target: { value: 'smtp.gmail.com:587' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } });
    fireEvent.change(timeout, { target: { value: '1' } });

    await waitFor(() => {
      expect(queryByText('Host and port are required')).not.toBeInTheDocument();
      expect(queryByText('Monitor interval is required')).not.toBeInTheDocument();
      expect(queryByText('Max redirects must be 0 or greater')).not.toBeInTheDocument();
      expect(
        queryByText('Timeout must be 0 or greater and less than schedule interval')
      ).not.toBeInTheDocument();
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: true,
        })
      );
    });
  });

  it('handles icmp validation', async () => {
    const { getByText, getByLabelText, queryByText } = render(<WrappedComponent />);

    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    fireEvent.change(monitorType, { target: { value: DataStream.ICMP } });

    const host = getByLabelText('Host') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in seconds') as HTMLInputElement;
    const wait = getByLabelText('Wait in seconds') as HTMLInputElement;

    // create errors
    fireEvent.change(host, { target: { value: '' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '-1' } });
    fireEvent.change(timeout, { target: { value: '-1' } });
    fireEvent.change(wait, { target: { value: '-1' } });

    await waitFor(() => {
      const hostError = getByText('Host is required');
      const monitorIntervalError = getByText('Monitor interval is required');
      const timeoutError = getByText(
        'Timeout must be 0 or greater and less than schedule interval'
      );
      const waitError = getByText('Wait must be 0 or greater');

      expect(hostError).toBeInTheDocument();
      expect(monitorIntervalError).toBeInTheDocument();
      expect(timeoutError).toBeInTheDocument();
      expect(waitError).toBeInTheDocument();
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: false,
        })
      );
    });

    // resolve errors
    fireEvent.change(host, { target: { value: '1.1.1.1' } });
    fireEvent.change(monitorIntervalNumber, { target: { value: '1' } });
    fireEvent.change(timeout, { target: { value: '1' } });
    fireEvent.change(wait, { target: { value: '1' } });

    await waitFor(() => {
      expect(queryByText('Host is required')).not.toBeInTheDocument();
      expect(queryByText('Monitor interval is required')).not.toBeInTheDocument();
      expect(
        queryByText('Timeout must be 0 or greater and less than schedule interval')
      ).not.toBeInTheDocument();
      expect(queryByText('Wait must be 0 or greater')).not.toBeInTheDocument();
      expect(onChange).toBeCalledWith(
        expect.objectContaining({
          isValid: true,
        })
      );
    });
  });

  it('handles changing TLS fields', async () => {
    const { findByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const enableSSL = queryByLabelText('Enable TLS configuration') as HTMLInputElement;

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        isValid: true,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              streams: [
                {
                  ...defaultNewPolicy.inputs[0].streams[0],
                  vars: {
                    ...defaultNewPolicy.inputs[0].streams[0].vars,
                    [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
                      value: null,
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_CERTIFICATE]: {
                      value: null,
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_KEY]: {
                      value: null,
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_KEY_PASSPHRASE]: {
                      value: null,
                      type: 'text',
                    },
                    [ConfigKeys.TLS_VERIFICATION_MODE]: {
                      value: null,
                      type: 'text',
                    },
                  },
                },
              ],
            },
            defaultNewPolicy.inputs[1],
            defaultNewPolicy.inputs[2],
          ],
        },
      });
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
      expect(onChange).toBeCalledWith({
        isValid: true,
        updatedPolicy: {
          ...defaultNewPolicy,
          inputs: [
            {
              ...defaultNewPolicy.inputs[0],
              streams: [
                {
                  ...defaultNewPolicy.inputs[0].streams[0],
                  vars: {
                    ...defaultNewPolicy.inputs[0].streams[0].vars,
                    [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
                      value: '"certificateAuthorities"',
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_CERTIFICATE]: {
                      value: '"clientCertificate"',
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_KEY]: {
                      value: '"clientKey"',
                      type: 'yaml',
                    },
                    [ConfigKeys.TLS_KEY_PASSPHRASE]: {
                      value: 'clientKeyPassphrase',
                      type: 'text',
                    },
                    [ConfigKeys.TLS_VERIFICATION_MODE]: {
                      value: VerificationMode.NONE,
                      type: 'text',
                    },
                  },
                },
              ],
            },
            defaultNewPolicy.inputs[1],
            defaultNewPolicy.inputs[2],
          ],
        },
      });
    });
  });
});
