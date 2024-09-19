/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUpdatePolicy } from './use_update_policy';
import { renderHook } from '@testing-library/react-hooks';
import { NewPackagePolicy } from '../../../../fleet/public';
import { validate } from './validation';
import {
  ConfigKeys,
  DataStream,
  TLSVersion,
  ICommonFields,
  ScheduleUnit,
  ICMPFields,
  TCPFields,
  ITLSFields,
  HTTPFields,
  BrowserFields,
} from './types';
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
      {
        type: 'synthetics/browser',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'synthetics',
              dataset: 'browser',
            },
            vars: {
              type: {
                value: 'browser',
                type: 'text',
              },
              name: {
                value: 'Sample name',
                type: 'text',
              },
              schedule: {
                value: '10s',
                type: 'text',
              },
              'source.zip_url.url': {
                type: 'text',
              },
              'source.zip_url.username': {
                type: 'text',
              },
              'source.zip_url.password': {
                type: 'password',
              },
              'source.zip_url.folder': {
                type: 'text',
              },
              'source.inline.script': {
                type: 'yaml',
              },
              'service.name': {
                type: 'text',
              },
              screenshots: {
                type: 'text',
              },
              synthetics_args: {
                type: 'yaml',
              },
              timeout: {
                type: 'text',
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

  const defaultCommonFields: Partial<ICommonFields> = {
    [ConfigKeys.APM_SERVICE_NAME]: 'APM Service name',
    [ConfigKeys.TAGS]: ['some', 'tags'],
    [ConfigKeys.SCHEDULE]: {
      number: '5',
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKeys.TIMEOUT]: '17',
  };

  const defaultTLSFields: Partial<ITLSFields> = {
    [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
      isEnabled: true,
      value: 'ca',
    },
    [ConfigKeys.TLS_CERTIFICATE]: {
      isEnabled: true,
      value: 'cert',
    },
    [ConfigKeys.TLS_KEY]: {
      isEnabled: true,
      value: 'key',
    },
    [ConfigKeys.TLS_KEY_PASSPHRASE]: {
      isEnabled: true,
      value: 'password',
    },
  };

  it('handles http data stream', async () => {
    const onChange = jest.fn();
    const initialProps = {
      defaultConfig: defaultConfig[DataStream.HTTP],
      config: defaultConfig[DataStream.HTTP],
      newPolicy,
      onChange,
      validate,
      monitorType: DataStream.HTTP,
    };
    const { result, rerender, waitFor } = renderHook((props) => useUpdatePolicy(props), {
      initialProps,
    });

    expect(result.current.config).toMatchObject({ ...defaultConfig[DataStream.HTTP] });

    const config: HTTPFields = {
      ...defaultConfig[DataStream.HTTP],
      ...defaultCommonFields,
      ...defaultTLSFields,
      [ConfigKeys.URLS]: 'url',
      [ConfigKeys.PROXY_URL]: 'proxyUrl',
    };

    // expect only http to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[3].enabled).toBe(false);

    rerender({
      ...initialProps,
      config,
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[0]?.streams[0]?.vars;

      expect(vars?.[ConfigKeys.MONITOR_TYPE].value).toEqual(config[ConfigKeys.MONITOR_TYPE]);
      expect(vars?.[ConfigKeys.URLS].value).toEqual(config[ConfigKeys.URLS]);
      expect(vars?.[ConfigKeys.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKeys.SCHEDULE].number}${config[ConfigKeys.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKeys.PROXY_URL].value).toEqual(config[ConfigKeys.PROXY_URL]);
      expect(vars?.[ConfigKeys.APM_SERVICE_NAME].value).toEqual(
        config[ConfigKeys.APM_SERVICE_NAME]
      );
      expect(vars?.[ConfigKeys.TIMEOUT].value).toEqual(`${config[ConfigKeys.TIMEOUT]}s`);
      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_STATUS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKeys.REQUEST_HEADERS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_HEADERS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_BODY_INDEX].value).toEqual(
        config[ConfigKeys.RESPONSE_BODY_INDEX]
      );
      expect(vars?.[ConfigKeys.RESPONSE_HEADERS_INDEX].value).toEqual(
        config[ConfigKeys.RESPONSE_HEADERS_INDEX]
      );
    });
  });

  it('stringifies array values and returns null for empty array values', async () => {
    const onChange = jest.fn();
    const initialProps = {
      defaultConfig: defaultConfig[DataStream.HTTP],
      config: defaultConfig[DataStream.HTTP],
      newPolicy,
      onChange,
      validate,
      monitorType: DataStream.HTTP,
    };
    const { rerender, result, waitFor } = renderHook((props) => useUpdatePolicy(props), {
      initialProps,
    });

    rerender({
      ...initialProps,
      config: {
        ...defaultConfig[DataStream.HTTP],
        [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: ['test'],
        [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: ['test'],
        [ConfigKeys.RESPONSE_STATUS_CHECK]: ['test'],
        [ConfigKeys.TAGS]: ['test'],
        [ConfigKeys.TLS_VERSION]: {
          value: [TLSVersion.ONE_ONE],
          isEnabled: true,
        },
      },
    });

    await waitFor(() => {
      // expect only http to be enabled
      expect(result.current.updatedPolicy.inputs[0].enabled).toBe(true);
      expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
      expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);
      expect(result.current.updatedPolicy.inputs[3].enabled).toBe(false);

      const vars = result.current.updatedPolicy.inputs[0]?.streams[0]?.vars;

      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual('["test"]');
      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual('["test"]');
      expect(vars?.[ConfigKeys.RESPONSE_STATUS_CHECK].value).toEqual('["test"]');
      expect(vars?.[ConfigKeys.TAGS].value).toEqual('["test"]');
      expect(vars?.[ConfigKeys.TLS_VERSION].value).toEqual('["TLSv1.1"]');
    });

    rerender({
      ...initialProps,
      config: {
        ...defaultConfig[DataStream.HTTP],
        [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: [],
        [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: [],
        [ConfigKeys.RESPONSE_STATUS_CHECK]: [],
        [ConfigKeys.TAGS]: [],
        [ConfigKeys.TLS_VERSION]: {
          value: [],
          isEnabled: true,
        },
      },
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[0]?.streams[0]?.vars;

      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual(null);
      expect(vars?.[ConfigKeys.RESPONSE_STATUS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKeys.TAGS].value).toEqual(null);
      expect(vars?.[ConfigKeys.TLS_VERSION].value).toEqual(null);
    });
  });

  it('handles tcp data stream', async () => {
    const onChange = jest.fn();
    const initialProps = {
      defaultConfig: defaultConfig[DataStream.TCP],
      config: defaultConfig[DataStream.TCP],
      newPolicy,
      onChange,
      validate,
      monitorType: DataStream.TCP,
    };
    const { result, rerender, waitFor } = renderHook((props) => useUpdatePolicy(props), {
      initialProps,
    });

    // expect only tcp to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[3].enabled).toBe(false);

    const config: TCPFields = {
      ...defaultConfig[DataStream.TCP],
      ...defaultCommonFields,
      ...defaultTLSFields,
      [ConfigKeys.HOSTS]: 'sampleHost',
      [ConfigKeys.PROXY_URL]: 'proxyUrl',
      [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: true,
      [ConfigKeys.RESPONSE_RECEIVE_CHECK]: 'response',
      [ConfigKeys.REQUEST_SEND_CHECK]: 'request',
    };

    rerender({
      ...initialProps,
      config,
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[1]?.streams[0]?.vars;

      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: result.current.updatedPolicy,
      });

      expect(vars?.[ConfigKeys.MONITOR_TYPE].value).toEqual(config[ConfigKeys.MONITOR_TYPE]);
      expect(vars?.[ConfigKeys.HOSTS].value).toEqual(config[ConfigKeys.HOSTS]);
      expect(vars?.[ConfigKeys.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKeys.SCHEDULE].number}${config[ConfigKeys.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKeys.PROXY_URL].value).toEqual(config[ConfigKeys.PROXY_URL]);
      expect(vars?.[ConfigKeys.APM_SERVICE_NAME].value).toEqual(
        config[ConfigKeys.APM_SERVICE_NAME]
      );
      expect(vars?.[ConfigKeys.TIMEOUT].value).toEqual(`${config[ConfigKeys.TIMEOUT]}s`);
      expect(vars?.[ConfigKeys.PROXY_USE_LOCAL_RESOLVER].value).toEqual(
        config[ConfigKeys.PROXY_USE_LOCAL_RESOLVER]
      );
      expect(vars?.[ConfigKeys.RESPONSE_RECEIVE_CHECK].value).toEqual(
        config[ConfigKeys.RESPONSE_RECEIVE_CHECK]
      );
      expect(vars?.[ConfigKeys.REQUEST_SEND_CHECK].value).toEqual(
        config[ConfigKeys.REQUEST_SEND_CHECK]
      );
    });
  });

  it('handles icmp data stream', async () => {
    const onChange = jest.fn();
    const initialProps = {
      defaultConfig: defaultConfig[DataStream.ICMP],
      config: defaultConfig[DataStream.ICMP],
      newPolicy,
      onChange,
      validate,
      monitorType: DataStream.ICMP,
    };
    const { rerender, result, waitFor } = renderHook((props) => useUpdatePolicy(props), {
      initialProps,
    });
    const config: ICMPFields = {
      ...defaultConfig[DataStream.ICMP],
      ...defaultCommonFields,
      [ConfigKeys.WAIT]: '2',
      [ConfigKeys.HOSTS]: 'sampleHost',
    };

    // expect only icmp to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(true);
    expect(result.current.updatedPolicy.inputs[3].enabled).toBe(false);

    // only call onChange when the policy is changed
    rerender({
      ...initialProps,
      config,
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[2]?.streams[0]?.vars;

      expect(vars?.[ConfigKeys.MONITOR_TYPE].value).toEqual(config[ConfigKeys.MONITOR_TYPE]);
      expect(vars?.[ConfigKeys.HOSTS].value).toEqual(config[ConfigKeys.HOSTS]);
      expect(vars?.[ConfigKeys.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKeys.SCHEDULE].number}${config[ConfigKeys.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKeys.APM_SERVICE_NAME].value).toEqual(
        config[ConfigKeys.APM_SERVICE_NAME]
      );
      expect(vars?.[ConfigKeys.TIMEOUT].value).toEqual(`${config[ConfigKeys.TIMEOUT]}s`);
      expect(vars?.[ConfigKeys.WAIT].value).toEqual(`${config[ConfigKeys.WAIT]}s`);

      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: result.current.updatedPolicy,
      });
    });
  });

  it('handles browser data stream', async () => {
    const onChange = jest.fn();
    const initialProps = {
      defaultConfig: defaultConfig[DataStream.BROWSER],
      config: defaultConfig[DataStream.BROWSER],
      newPolicy,
      onChange,
      validate,
      monitorType: DataStream.BROWSER,
    };
    const { result, rerender, waitFor } = renderHook((props) => useUpdatePolicy(props), {
      initialProps,
    });

    // expect only browser to be enabled
    expect(result.current.updatedPolicy.inputs[0].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);
    expect(result.current.updatedPolicy.inputs[3].enabled).toBe(true);

    const config: BrowserFields = {
      ...defaultConfig[DataStream.BROWSER],
      ...defaultCommonFields,
      [ConfigKeys.SOURCE_INLINE]: 'inlineScript',
      [ConfigKeys.SOURCE_ZIP_URL]: 'zipFolder',
      [ConfigKeys.SOURCE_ZIP_FOLDER]: 'zipFolder',
      [ConfigKeys.SOURCE_ZIP_USERNAME]: 'username',
      [ConfigKeys.SOURCE_ZIP_PASSWORD]: 'password',
      [ConfigKeys.SCREENSHOTS]: 'off',
      [ConfigKeys.SYNTHETICS_ARGS]: ['args'],
    };

    rerender({
      ...initialProps,
      config,
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[3]?.streams[0]?.vars;

      expect(vars?.[ConfigKeys.SOURCE_ZIP_FOLDER].value).toEqual(
        config[ConfigKeys.SOURCE_ZIP_FOLDER]
      );
      expect(vars?.[ConfigKeys.SOURCE_ZIP_PASSWORD].value).toEqual(
        config[ConfigKeys.SOURCE_ZIP_PASSWORD]
      );
      expect(vars?.[ConfigKeys.SOURCE_ZIP_URL].value).toEqual(config[ConfigKeys.SOURCE_ZIP_URL]);
      expect(vars?.[ConfigKeys.SOURCE_INLINE].value).toEqual(
        JSON.stringify(config[ConfigKeys.SOURCE_INLINE])
      );
      expect(vars?.[ConfigKeys.SOURCE_ZIP_PASSWORD].value).toEqual(
        config[ConfigKeys.SOURCE_ZIP_PASSWORD]
      );
      expect(vars?.[ConfigKeys.SCREENSHOTS].value).toEqual(config[ConfigKeys.SCREENSHOTS]);
      expect(vars?.[ConfigKeys.SYNTHETICS_ARGS].value).toEqual(
        JSON.stringify(config[ConfigKeys.SYNTHETICS_ARGS])
      );
      expect(vars?.[ConfigKeys.APM_SERVICE_NAME].value).toEqual(
        config[ConfigKeys.APM_SERVICE_NAME]
      );
      expect(vars?.[ConfigKeys.TIMEOUT].value).toEqual(`${config[ConfigKeys.TIMEOUT]}s`);

      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: result.current.updatedPolicy,
      });
    });
  });
});
