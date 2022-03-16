/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useUpdatePolicy } from './use_update_policy';
import { NewPackagePolicy } from '../../../../../fleet/public';
import { validate } from '../validation';
import {
  ConfigKey,
  DataStream,
  TLSVersion,
  CommonFields,
  ScheduleUnit,
  ICMPFields,
  TCPFields,
  TLSFields,
  HTTPFields,
  BrowserFields,
} from '../types';
import { defaultConfig } from '../synthetics_policy_create_extension';

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
              'throttling.download_speed': {
                type: 'text',
                value: '""',
              },
              'throttling.upload_speed': {
                type: 'text',
                value: '""',
              },
              'throttling.latency': {
                type: 'text',
                value: '""',
              },
              'throttling.config': {
                type: 'text',
                value: '""',
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

  const defaultCommonFields: Partial<CommonFields> = {
    [ConfigKey.APM_SERVICE_NAME]: 'APM Service name',
    [ConfigKey.TAGS]: ['some', 'tags'],
    [ConfigKey.SCHEDULE]: {
      number: '5',
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKey.TIMEOUT]: '17',
  };

  const defaultTLSFields: Partial<TLSFields> = {
    [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: 'ca',
    [ConfigKey.TLS_CERTIFICATE]: 'cert',
    [ConfigKey.TLS_KEY]: 'key',
    [ConfigKey.TLS_KEY_PASSPHRASE]: 'password',
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
      [ConfigKey.URLS]: 'url',
      [ConfigKey.PROXY_URL]: 'proxyUrl',
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

      expect(vars?.[ConfigKey.MONITOR_TYPE].value).toEqual(config[ConfigKey.MONITOR_TYPE]);
      expect(vars?.[ConfigKey.URLS].value).toEqual(config[ConfigKey.URLS]);
      expect(vars?.[ConfigKey.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKey.SCHEDULE].number}${config[ConfigKey.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKey.PROXY_URL].value).toEqual(config[ConfigKey.PROXY_URL]);
      expect(vars?.[ConfigKey.APM_SERVICE_NAME].value).toEqual(config[ConfigKey.APM_SERVICE_NAME]);
      expect(vars?.[ConfigKey.TIMEOUT].value).toEqual(`${config[ConfigKey.TIMEOUT]}s`);
      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_STATUS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKey.REQUEST_HEADERS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_HEADERS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_BODY_INDEX].value).toEqual(
        config[ConfigKey.RESPONSE_BODY_INDEX]
      );
      expect(vars?.[ConfigKey.RESPONSE_HEADERS_INDEX].value).toEqual(
        config[ConfigKey.RESPONSE_HEADERS_INDEX]
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
        [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: ['test'],
        [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: ['test'],
        [ConfigKey.RESPONSE_STATUS_CHECK]: ['test'],
        [ConfigKey.TAGS]: ['test'],
        [ConfigKey.TLS_VERSION]: [TLSVersion.ONE_ONE],
      },
    });

    await waitFor(() => {
      // expect only http to be enabled
      expect(result.current.updatedPolicy.inputs[0].enabled).toBe(true);
      expect(result.current.updatedPolicy.inputs[1].enabled).toBe(false);
      expect(result.current.updatedPolicy.inputs[2].enabled).toBe(false);
      expect(result.current.updatedPolicy.inputs[3].enabled).toBe(false);

      const vars = result.current.updatedPolicy.inputs[0]?.streams[0]?.vars;

      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual('["test"]');
      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual('["test"]');
      expect(vars?.[ConfigKey.RESPONSE_STATUS_CHECK].value).toEqual('["test"]');
      expect(vars?.[ConfigKey.TAGS].value).toEqual('["test"]');
      expect(vars?.[ConfigKey.TLS_VERSION].value).toEqual('["TLSv1.1"]');
    });

    rerender({
      ...initialProps,
      config: {
        ...defaultConfig[DataStream.HTTP],
        [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
        [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
        [ConfigKey.RESPONSE_STATUS_CHECK]: [],
        [ConfigKey.TAGS]: [],
        [ConfigKey.TLS_VERSION]: [],
      },
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[0]?.streams[0]?.vars;

      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE].value).toEqual(null);
      expect(vars?.[ConfigKey.RESPONSE_STATUS_CHECK].value).toEqual(null);
      expect(vars?.[ConfigKey.TAGS].value).toEqual(null);
      expect(vars?.[ConfigKey.TLS_VERSION].value).toEqual(null);
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
      [ConfigKey.HOSTS]: 'sampleHost',
      [ConfigKey.PROXY_URL]: 'proxyUrl',
      [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: true,
      [ConfigKey.RESPONSE_RECEIVE_CHECK]: 'response',
      [ConfigKey.REQUEST_SEND_CHECK]: 'request',
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

      expect(vars?.[ConfigKey.MONITOR_TYPE].value).toEqual(config[ConfigKey.MONITOR_TYPE]);
      expect(vars?.[ConfigKey.HOSTS].value).toEqual(config[ConfigKey.HOSTS]);
      expect(vars?.[ConfigKey.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKey.SCHEDULE].number}${config[ConfigKey.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKey.PROXY_URL].value).toEqual(config[ConfigKey.PROXY_URL]);
      expect(vars?.[ConfigKey.APM_SERVICE_NAME].value).toEqual(config[ConfigKey.APM_SERVICE_NAME]);
      expect(vars?.[ConfigKey.TIMEOUT].value).toEqual(`${config[ConfigKey.TIMEOUT]}s`);
      expect(vars?.[ConfigKey.PROXY_USE_LOCAL_RESOLVER].value).toEqual(
        config[ConfigKey.PROXY_USE_LOCAL_RESOLVER]
      );
      expect(vars?.[ConfigKey.RESPONSE_RECEIVE_CHECK].value).toEqual(
        config[ConfigKey.RESPONSE_RECEIVE_CHECK]
      );
      expect(vars?.[ConfigKey.REQUEST_SEND_CHECK].value).toEqual(
        config[ConfigKey.REQUEST_SEND_CHECK]
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
      [ConfigKey.WAIT]: '2',
      [ConfigKey.HOSTS]: 'sampleHost',
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

      expect(vars?.[ConfigKey.MONITOR_TYPE].value).toEqual(config[ConfigKey.MONITOR_TYPE]);
      expect(vars?.[ConfigKey.HOSTS].value).toEqual(config[ConfigKey.HOSTS]);
      expect(vars?.[ConfigKey.SCHEDULE].value).toEqual(
        JSON.stringify(
          `@every ${config[ConfigKey.SCHEDULE].number}${config[ConfigKey.SCHEDULE].unit}`
        )
      );
      expect(vars?.[ConfigKey.APM_SERVICE_NAME].value).toEqual(config[ConfigKey.APM_SERVICE_NAME]);
      expect(vars?.[ConfigKey.TIMEOUT].value).toEqual(`${config[ConfigKey.TIMEOUT]}s`);
      expect(vars?.[ConfigKey.WAIT].value).toEqual(`${config[ConfigKey.WAIT]}s`);

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
      [ConfigKey.SOURCE_INLINE]: 'inlineScript',
      [ConfigKey.SOURCE_ZIP_URL]: 'zipFolder',
      [ConfigKey.SOURCE_ZIP_FOLDER]: 'zipFolder',
      [ConfigKey.SOURCE_ZIP_USERNAME]: 'username',
      [ConfigKey.SOURCE_ZIP_PASSWORD]: 'password',
      [ConfigKey.SCREENSHOTS]: 'off',
      [ConfigKey.SYNTHETICS_ARGS]: ['args'],
      [ConfigKey.DOWNLOAD_SPEED]: '13',
      [ConfigKey.UPLOAD_SPEED]: '3',
      [ConfigKey.LATENCY]: '7',
    };

    rerender({
      ...initialProps,
      config,
    });

    await waitFor(() => {
      const vars = result.current.updatedPolicy.inputs[3]?.streams[0]?.vars;

      expect(vars?.[ConfigKey.SOURCE_ZIP_FOLDER].value).toEqual(
        config[ConfigKey.SOURCE_ZIP_FOLDER]
      );
      expect(vars?.[ConfigKey.SOURCE_ZIP_PASSWORD].value).toEqual(
        config[ConfigKey.SOURCE_ZIP_PASSWORD]
      );
      expect(vars?.[ConfigKey.SOURCE_ZIP_URL].value).toEqual(config[ConfigKey.SOURCE_ZIP_URL]);
      expect(vars?.[ConfigKey.SOURCE_INLINE].value).toEqual(
        JSON.stringify(config[ConfigKey.SOURCE_INLINE])
      );
      expect(vars?.[ConfigKey.SOURCE_ZIP_PASSWORD].value).toEqual(
        config[ConfigKey.SOURCE_ZIP_PASSWORD]
      );
      expect(vars?.[ConfigKey.SCREENSHOTS].value).toEqual(config[ConfigKey.SCREENSHOTS]);
      expect(vars?.[ConfigKey.SYNTHETICS_ARGS].value).toEqual(
        JSON.stringify(config[ConfigKey.SYNTHETICS_ARGS])
      );
      expect(vars?.[ConfigKey.APM_SERVICE_NAME].value).toEqual(config[ConfigKey.APM_SERVICE_NAME]);
      expect(vars?.[ConfigKey.TIMEOUT].value).toEqual(`${config[ConfigKey.TIMEOUT]}s`);
      expect(vars?.[ConfigKey.THROTTLING_CONFIG].value).toEqual(
        `${config[ConfigKey.DOWNLOAD_SPEED]}d/${config[ConfigKey.UPLOAD_SPEED]}u/${
          config[ConfigKey.LATENCY]
        }l`
      );

      expect(onChange).toBeCalledWith({
        isValid: false,
        updatedPolicy: result.current.updatedPolicy,
      });
    });
  });
});
