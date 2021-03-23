/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { CustomFields } from './custom_fields';
import {
  ConfigKeys,
  Config,
  DataStream,
  HTTPMethod,
  Mode,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
} from './types';
import { validate as centralValidation } from './validation';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultCustomConfig = {
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: 0,
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: false,
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: [],
  [ConfigKeys.RESPONSE_STATUS_CHECK]: [], // may need to make sure that this field is not applied when length is 0
  [ConfigKeys.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.TEXT,
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: {},
  [ConfigKeys.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKeys.REQUEST_SEND_CHECK]: '',
  [ConfigKeys.SCHEDULE]: {
    number: '5',
    unit: ScheduleUnit.SECONDS,
  },
  [ConfigKeys.SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: 1600,
  [ConfigKeys.URLS]: '',
  [ConfigKeys.WAIT]: 1,
};

const defaultConfig: Config = {
  name: '',
  ...defaultCustomConfig,
};

const defaultValidation = centralValidation[DataStream.HTTP];

describe('<CustomFields />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({ defaultValues = defaultConfig, validate = defaultValidation }) => {
    return <CustomFields defaultValues={defaultValues} onChange={onChange} validate={validate} />;
  };

  it('renders CustomFields', async () => {
    const { getByText, getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    // const tags = getByLabelText('Tags') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in milliseconds') as HTMLInputElement;
    // const wait = getByLabelText('Wait in seconds') as HTMLInputElement;
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
    // expect(tags).toBeInTheDocument();
    expect(apmServiceName).toBeInTheDocument();
    expect(apmServiceName.value).toEqual(defaultConfig[ConfigKeys.SERVICE_NAME]);
    expect(maxRedirects).toBeInTheDocument();
    expect(maxRedirects.value).toEqual(`${defaultConfig[ConfigKeys.MAX_REDIRECTS]}`);
    expect(timeout).toBeInTheDocument();
    expect(timeout.value).toEqual(`${defaultConfig[ConfigKeys.TIMEOUT]}`);

    // ensure other monitor type options are not in the DOM
    expect(queryByLabelText('Host')).not.toBeInTheDocument();
    expect(queryByLabelText('Wait in seconds')).not.toBeInTheDocument();

    // ensure at least one http advanced option is present
    const advancedOptionsButton = getByText('Advanced options');
    fireEvent.click(advancedOptionsButton);
    await waitFor(() => {
      expect(getByLabelText('Request method')).toBeInTheDocument();
    });
  });

  it('handles updating each field', async () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const url = getByLabelText('URL') as HTMLInputElement;
    const proxyUrl = getByLabelText('Proxy URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const monitorIntervalUnit = getByLabelText('Unit') as HTMLInputElement;
    // const tags = getByLabelText('Tags') as HTMLInputElement;
    const apmServiceName = getByLabelText('APM service name') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in milliseconds') as HTMLInputElement;

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
    const { getByText, getByLabelText, queryByLabelText } = render(<WrappedComponent />);
    const monitorType = getByLabelText('Monitor Type') as HTMLInputElement;
    fireEvent.change(monitorType, { target: { value: DataStream.TCP } });

    // expect tcp fields to be in the DOM
    const host = getByLabelText('Host') as HTMLInputElement;

    expect(host).toBeInTheDocument();
    expect(host.value).toEqual(defaultConfig[ConfigKeys.HOSTS]);

    // expect HTTP fields not to be in the DOM
    expect(queryByLabelText('URL')).not.toBeInTheDocument();

    // ensure at least one tcp advanced option is present
    const advancedOptionsButton = getByText('Advanced options');
    fireEvent.click(advancedOptionsButton);

    expect(queryByLabelText('Request method')).not.toBeInTheDocument();
    expect(getByLabelText('Request payload')).toBeInTheDocument();

    fireEvent.change(monitorType, { target: { value: DataStream.ICMP } });

    // expect ICMP fields to be in the DOM
    expect(getByLabelText('Wait in seconds')).toBeInTheDocument();

    // expect TCP fields not to be in the DOM
    expect(queryByLabelText('Proxy URL')).not.toBeInTheDocument();
  });

  it('handles validation', () => {
    const { getByText, getByLabelText, queryByText } = render(<WrappedComponent />);

    const url = getByLabelText('URL') as HTMLInputElement;
    const monitorIntervalNumber = getByLabelText('Number') as HTMLInputElement;
    const maxRedirects = getByLabelText('Max redirects') as HTMLInputElement;
    const timeout = getByLabelText('Timeout in milliseconds') as HTMLInputElement;

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
