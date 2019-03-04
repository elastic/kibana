/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Dispatch, useEffect, useReducer } from 'react';

interface Props {
  kfetch: (opts: any) => Promise<any>;
}

interface State {
  loading: boolean;
  time: Date;
  errorMessage: string;
}

type Action = { type: 'loaded'; time: Date } | { type: 'loadError'; message: string };

function initialState(): State {
  return {
    loading: true,
    time: new Date(),
    errorMessage: '',
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        loading: false,
        time: action.time,
      };
    case 'loadError':
      return {
        ...state,
        loading: false,
        errorMessage: action.message,
      };
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

function fetchInitialState(kfetch: any, dispatch: Dispatch<Action>) {
  return kfetch({
    pathname: '/api/viz_editor/example',
  })
    .then((data: any) =>
      dispatch({
        type: 'loaded',
        time: new Date(data.time),
      })
    )
    .catch(({ message }: any) =>
      dispatch({
        type: 'loadError',
        message,
      })
    );
}

export function Main({ kfetch }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState());
  const { time, loading, errorMessage } = state;

  useEffect(() => fetchInitialState(kfetch, dispatch), []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="vizEditor.helloWorldText"
                defaultMessage="{title} Hello World!"
                values={{ title: 'New Visualization Editor' }}
              />
            </h1>
          </EuiTitle>
          {!!errorMessage ? (
            <p>
              <span className="euiTextColor euiTextColor--danger">{errorMessage}</span>
            </p>
          ) : null}
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="vizEditor.congratulationsTitle"
                  defaultMessage="Congratulations"
                />
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiText>
              <h3>
                <FormattedMessage
                  id="vizEditor.congratulationsText"
                  defaultMessage="You have successfully created your first Kibana Plugin!"
                />
              </h3>
              <p>
                <FormattedMessage
                  id="vizEditor.serverTimeText"
                  defaultMessage="The server time (via API call) is {time}"
                  values={{ time }}
                />
              </p>
            </EuiText>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
