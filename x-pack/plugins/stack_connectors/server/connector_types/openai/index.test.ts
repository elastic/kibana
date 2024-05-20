/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import axios from 'axios';
import { configValidator, getConnectorType } from '.';
import { Config, Secrets } from '../../../common/openai/types';
import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { DEFAULT_OPENAI_MODEL, OpenAiProviderType } from '../../../common/openai/constants';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);

axios.create = jest.fn(() => axios);

let connectorType: SubActionConnectorType<Config, Secrets>;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

describe('OpenAI Connector', () => {
  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    connectorType = getConnectorType();
  });
  test('exposes the connector as `OpenAI` with id `.gen-ai`', () => {
    expect(connectorType.id).toEqual('.gen-ai');
    expect(connectorType.name).toEqual('OpenAI');
  });
  describe('config validation', () => {
    test('config validation passes when only required fields are provided', () => {
      const config: Config = {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
      };

      expect(configValidator(config, { configurationUtilities })).toEqual(config);
    });

    test('config validation failed when a url is invalid', () => {
      const config: Config = {
        apiUrl: 'example.com/do-something',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        '"Error configuring OpenAI action: Error: URL Error: Invalid URL: example.com/do-something"'
      );
    });

    test('config validation failed when the OpenAI API provider is empty', () => {
      const config: Config = {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: '' as OpenAiProviderType,
        defaultModel: DEFAULT_OPENAI_MODEL,
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        '"Error configuring OpenAI action: Error: API Provider is not supported"'
      );
    });

    test('config validation failed when the OpenAI API provider is invalid', () => {
      const config: Config = {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: 'bad-one' as OpenAiProviderType,
        defaultModel: DEFAULT_OPENAI_MODEL,
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        '"Error configuring OpenAI action: Error: API Provider is not supported: bad-one"'
      );
    });

    test('config validation returns an error if the specified URL is not added to allowedHosts', () => {
      const configUtils = {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_: string) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      };

      const config: Config = {
        apiUrl: 'http://mylisteningserver.com:9200/endpoint',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
      };

      expect(() => {
        configValidator(config, { configurationUtilities: configUtils });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring OpenAI action: Error: error validating url: target url is not present in allowedHosts"`
      );
    });
  });
});
