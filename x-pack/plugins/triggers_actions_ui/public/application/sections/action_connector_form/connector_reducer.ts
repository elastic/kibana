/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';
import { Reducer } from 'react';
import { UserConfiguredActionConnector } from '../../../types';

export type InitialConnector<Config, Secrets> = Partial<
  UserConfiguredActionConnector<Config, Secrets>
> &
  Pick<UserConfiguredActionConnector<Config, Secrets>, 'actionTypeId' | 'config' | 'secrets'>;

interface CommandType<
  T extends 'setConnector' | 'setProperty' | 'setConfigProperty' | 'setSecretsProperty'
> {
  type: T;
}

interface Payload<Keys, Value> {
  key: Keys;
  value: Value;
}

interface TPayload<T, Key extends keyof T> {
  key: Key;
  value: T[Key] | null;
}

export type ConnectorReducerAction<Config, Secrets> =
  | {
      command: CommandType<'setConnector'>;
      payload: Payload<'connector', InitialConnector<Config, Secrets>>;
    }
  | {
      command: CommandType<'setProperty'>;
      payload: TPayload<
        UserConfiguredActionConnector<Config, Secrets>,
        keyof UserConfiguredActionConnector<Config, Secrets>
      >;
    }
  | {
      command: CommandType<'setConfigProperty'>;
      payload: TPayload<Config, keyof Config>;
    }
  | {
      command: CommandType<'setSecretsProperty'>;
      payload: TPayload<Secrets, keyof Secrets>;
    };

export type ConnectorReducer<Config, Secrets> = Reducer<
  { connector: UserConfiguredActionConnector<Config, Secrets> },
  ConnectorReducerAction<Config, Secrets>
>;

export const createConnectorReducer = <Config, Secrets>() => <
  ConnectorPhase extends
    | InitialConnector<Config, Secrets>
    | UserConfiguredActionConnector<Config, Secrets>
>(
  state: { connector: ConnectorPhase },
  action: ConnectorReducerAction<Config, Secrets>
) => {
  const { connector } = state;

  switch (action.command.type) {
    case 'setConnector': {
      const { key, value } = action.payload as Payload<'connector', ConnectorPhase>;
      if (key === 'connector') {
        return {
          ...state,
          connector: value,
        };
      } else {
        return state;
      }
    }
    case 'setProperty': {
      const { key, value } = action.payload as TPayload<
        UserConfiguredActionConnector<Config, Secrets>,
        keyof UserConfiguredActionConnector<Config, Secrets>
      >;
      if (isEqual(connector[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            [key]: value,
          },
        };
      }
    }
    case 'setConfigProperty': {
      const { key, value } = action.payload as TPayload<Config, keyof Config>;
      if (isEqual(connector.config[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            config: {
              ...(connector.config as Config),
              [key]: value,
            },
          },
        };
      }
    }
    case 'setSecretsProperty': {
      const { key, value } = action.payload as TPayload<Secrets, keyof Secrets>;
      if (isEqual(connector.secrets[key], value)) {
        return state;
      } else {
        return {
          ...state,
          connector: {
            ...connector,
            secrets: {
              ...(connector.secrets as Secrets),
              [key]: value,
            },
          },
        };
      }
    }
  }
};
