/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUpdatePolicy } from './use_update_policy';
import { act, renderHook } from '@testing-library/react-hooks';
import { NewPackagePolicy } from '../../../../fleet/public';
import { validate } from './validation';
import { ConfigKeys, DataStream, TLSVersion } from './types';
import { defaultConfig } from './synthetics_policy_create_extension';

describe('useBarChartsHooks', () => {
  const newPolicy: NewPackagePolicy = {
    name: '',
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
                value: '',
                type: 'text',
              },
              schedule: {
                value: '"@every 3m"',
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
                value: null,
                type: 'yaml',
              },
              'check.response.body.negative': {
                value: null,
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
              'ssl.supported_protocols': {
                value: '',
                type: 'yaml',
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
                type: 'integer',
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
                type: 'integer',
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

  it('handles http data stream', () => {
    const onChange = jest.fn();
    const { result } = renderHook((props) => useUpdatePolicy(props), {
      initialProps: { defaultConfig, newPolicy, onChange, validate, monitorType: DataStream.HTTP },
    });

    expect(result.current.config).toMatchObject({ ...defaultConfig[DataStream.HTTP] });

    // expect only http to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);

    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.MONITOR_TYPE].value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.MONITOR_TYPE]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.URLS].value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.URLS]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.SCHEDULE].value
    ).toEqual(
      JSON.stringify(
        `@every ${defaultConfig[DataStream.HTTP][ConfigKeys.SCHEDULE].number}${
          defaultConfig[DataStream.HTTP][ConfigKeys.SCHEDULE].unit
        }`
      )
    );
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.PROXY_URL].value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.PROXY_URL]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.APM_SERVICE_NAME].value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.APM_SERVICE_NAME]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.TIMEOUT].value
    ).toEqual(`${defaultConfig[DataStream.HTTP][ConfigKeys.TIMEOUT]}s`);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE
      ].value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE
      ].value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_STATUS_CHECK]
        .value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.REQUEST_HEADERS_CHECK]
        .value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_HEADERS_CHECK]
        .value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_BODY_INDEX]
        .value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.RESPONSE_BODY_INDEX]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_HEADERS_INDEX]
        .value
    ).toEqual(defaultConfig[DataStream.HTTP][ConfigKeys.RESPONSE_HEADERS_INDEX]);
  });

  it('stringifies array values and returns null for empty array values', () => {
    const onChange = jest.fn();
    const { result } = renderHook((props) => useUpdatePolicy(props), {
      initialProps: { defaultConfig, newPolicy, onChange, validate, monitorType: DataStream.HTTP },
    });

    act(() => {
      result.current.setConfig({
        ...defaultConfig,
        [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: ['test'],
        [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: ['test'],
        [ConfigKeys.RESPONSE_STATUS_CHECK]: ['test'],
        [ConfigKeys.TAGS]: ['test'],
        [ConfigKeys.TLS_VERSION]: {
          value: [TLSVersion.ONE_ONE],
          isEnabled: true,
        },
      });
    });

    // expect only http to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);

    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE
      ].value
    ).toEqual('["test"]');
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE
      ].value
    ).toEqual('["test"]');
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_STATUS_CHECK]
        .value
    ).toEqual('["test"]');
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.TAGS].value
    ).toEqual('["test"]');
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.TLS_VERSION].value
    ).toEqual('["TLSv1.1"]');

    act(() => {
      result.current.setConfig({
        ...defaultConfig,
        [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
        [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
        [ConfigKeys.RESPONSE_STATUS_CHECK]: [],
        [ConfigKeys.TAGS]: [],
        [ConfigKeys.TLS_VERSION]: {
          value: [],
          isEnabled: true,
        },
      });
    });

    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE
      ].value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[
        ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE
      ].value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_STATUS_CHECK]
        .value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.TAGS].value
    ).toEqual(null);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.TLS_VERSION].value
    ).toEqual(null);
  });

  it('handles tcp data stream', () => {
    const onChange = jest.fn();
    const { result } = renderHook((props) => useUpdatePolicy(props), {
      initialProps: { defaultConfig, newPolicy, onChange, validate, monitorType: DataStream.TCP },
    });

    // expect only tcp to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);

    expect(onChange).toBeCalledWith({
      isValid: false,
      updatedPolicy: result.current.updatedPolicy,
    });

    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.MONITOR_TYPE].value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.MONITOR_TYPE]);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.HOSTS].value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.HOSTS]);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.SCHEDULE].value
    ).toEqual(
      JSON.stringify(
        `@every ${defaultConfig[DataStream.TCP][ConfigKeys.SCHEDULE].number}${
          defaultConfig[DataStream.TCP][ConfigKeys.SCHEDULE].unit
        }`
      )
    );
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.PROXY_URL].value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.PROXY_URL]);
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.APM_SERVICE_NAME].value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.APM_SERVICE_NAME]);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.TIMEOUT].value
    ).toEqual(`${defaultConfig[DataStream.TCP][ConfigKeys.TIMEOUT]}s`);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[
        ConfigKeys.PROXY_USE_LOCAL_RESOLVER
      ].value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.PROXY_USE_LOCAL_RESOLVER]);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.RESPONSE_RECEIVE_CHECK]
        .value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.RESPONSE_RECEIVE_CHECK]);
    expect(
      result.current.updatedPolicy.inputs[1]?.streams[0]?.vars?.[ConfigKeys.REQUEST_SEND_CHECK]
        .value
    ).toEqual(defaultConfig[DataStream.TCP][ConfigKeys.REQUEST_SEND_CHECK]);
  });

  it('handles icmp data stream', () => {
    const onChange = jest.fn();
    const { result } = renderHook((props) => useUpdatePolicy(props), {
      initialProps: { defaultConfig, newPolicy, onChange, validate, monitorType: DataStream.ICMP },
    });

    // expect only icmp to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(true);

    expect(onChange).toBeCalledWith({
      isValid: false,
      updatedPolicy: result.current.updatedPolicy,
    });

    expect(
      result.current.updatedPolicy.inputs[2]?.streams[0]?.vars?.[ConfigKeys.MONITOR_TYPE].value
    ).toEqual(defaultConfig[DataStream.ICMP][ConfigKeys.MONITOR_TYPE]);
    expect(
      result.current.updatedPolicy.inputs[2]?.streams[0]?.vars?.[ConfigKeys.HOSTS].value
    ).toEqual(defaultConfig[DataStream.ICMP][ConfigKeys.HOSTS]);
    expect(
      result.current.updatedPolicy.inputs[2]?.streams[0]?.vars?.[ConfigKeys.SCHEDULE].value
    ).toEqual(
      JSON.stringify(
        `@every ${defaultConfig[DataStream.ICMP][ConfigKeys.SCHEDULE].number}${
          defaultConfig[DataStream.ICMP][ConfigKeys.SCHEDULE].unit
        }`
      )
    );
    expect(
      result.current.updatedPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.APM_SERVICE_NAME].value
    ).toEqual(defaultConfig[DataStream.ICMP][ConfigKeys.APM_SERVICE_NAME]);
    expect(
      result.current.updatedPolicy.inputs[2]?.streams[0]?.vars?.[ConfigKeys.TIMEOUT].value
    ).toEqual(`${defaultConfig[DataStream.ICMP][ConfigKeys.TIMEOUT]}s`);
    expect(
      result.current.updatedPolicy.inputs[2]?.streams[0]?.vars?.[ConfigKeys.WAIT].value
    ).toEqual(`${defaultConfig[DataStream.ICMP][ConfigKeys.WAIT]}s`);
  });
});
