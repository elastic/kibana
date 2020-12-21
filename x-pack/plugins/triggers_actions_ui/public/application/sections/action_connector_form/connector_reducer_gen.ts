/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionConnector } from '../../../types';

export type CommandType<Config, Secrets> =
  | {
      type: 'setConnector';
      connector: ActionConnector<Config, Secrets>;
    }
  | {
      type: 'setProperty';
      payload: ActionConnector<Config, Secrets>;
    }
  | {
      type: 'setConfigProperty';
      payload: Config;
    }
  | {
      type: 'setSecretsProperty';
      payload: Secrets;
    };

export interface ActionState<Config, Secrets> {
  connector: ActionConnector<Config, Secrets>;
}

export const createConnectorReducer = <Config, Secrets>() => (
  state: ActionState<Config, Secrets>,
  action: CommandType<Config, Secrets>
) => {
  const { connector } = state;

  switch (action.type) {
    case 'setConnector': {
      return {
        ...state,
        connector: action.connector,
      };
    }
    case 'setProperty': {
      return {
        ...state,
        connector: {
          ...connector,
          ...action.payload,
        },
      };
    }
    case 'setConfigProperty': {
      return {
        ...state,
        connector: {
          ...connector,
          config: action.payload,
        },
      };
    }
    case 'setSecretsProperty': {
      return {
        ...state,
        connector: {
          ...connector,
          secrets: action.payload,
        },
      };
    }
  }
};
