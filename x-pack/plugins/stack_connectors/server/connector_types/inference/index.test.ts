/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { configValidator, getConnectorType } from '.';
import { Config, Secrets } from '../../../common/inference/types';
import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { DEFAULT_PROVIDER, DEFAULT_TASK_TYPE } from '../../../common/inference/constants';

let connectorType: SubActionConnectorType<Config, Secrets>;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

describe('AI Connector', () => {
  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    connectorType = getConnectorType();
  });
  test('exposes the connector as `AI Connector` with id `.inference`', () => {
    expect(connectorType.id).toEqual('.inference');
    expect(connectorType.name).toEqual('AI Connector');
  });
  describe('config validation', () => {
    test('config validation passes when only required fields are provided', () => {
      const config: Config = {
        providerConfig: {
          url: 'https://api.openai.com/v1/chat/completions',
        },
        provider: DEFAULT_PROVIDER,
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      };

      expect(configValidator(config, { configurationUtilities })).toEqual(config);
    });

    test('config validation failed when a url is invalid', () => {
      const config: Config = {
        providerConfig: {
          url: 'example.com/do-something',
        },
        provider: DEFAULT_PROVIDER,
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        '"Error configuring OpenAI action: Error: URL Error: Invalid URL: example.com/do-something"'
      );
    });

    test('config validation failed when the OpenAI API provider is empty', () => {
      const config: Config = {
        providerConfig: {},
        provider: '',
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        '"Error configuring OpenAI action: Error: API Provider is not supported"'
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
        providerConfig: {
          url: 'http://mylisteningserver.com:9200/endpoint',
        },
        provider: '',
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: '',
        providerSchema: [],
        taskTypeConfig: {},
      };

      expect(() => {
        configValidator(config, { configurationUtilities: configUtils });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring OpenAI action: Error: error validating url: target url is not present in allowedHosts"`
      );
    });
  });
});
