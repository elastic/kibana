/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useIsMounted } from '../../../components/hooks/use_is_mounted';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUrlParams } from '../../../components/hooks/use_url_params';
import {
  CommandDefinition,
  Console,
  RegisteredConsoleClient,
  useConsoleManager,
} from '../../../components/console';

const delay = async (ms: number = 4000) => new Promise((r) => setTimeout(r, ms));

const getCommandList = (): CommandDefinition[] => {
  return [
    {
      name: 'cmd1',
      about: 'Runs cmd1',
      RenderComponent: ({ command, setStatus, store, setStore }) => {
        const isMounted = useIsMounted();

        const [apiResponse, setApiResponse] = useState<null | string>(null);
        const [uiResponse, setUiResponse] = useState<null | ReactElement>(null);

        // Emulate a real action where:
        // 1. an api request is done to create the action
        // 2. wait for a response
        // 3. account for component mount/unmount and prevent duplicate api calls

        useEffect(() => {
          (async () => {
            // Emulate an api call
            if (!store.apiInflight) {
              setStore({
                ...store,
                apiInflight: true,
              });

              window.console.warn(`${Math.random()} ------> cmd1: doing async work`);

              await delay(6000);
              setApiResponse(`API was called at: ${new Date().toLocaleString()}`);
            }
          })();
        }, [setStore, store]);

        useEffect(() => {
          (async () => {
            const doUiResponse = () => {
              setUiResponse(
                <EuiText>
                  <EuiText>{`${command.commandDefinition.name}`}</EuiText>
                  <EuiText>{`command input: ${command.input}`}</EuiText>
                  <EuiText>{'Arguments provided:'}</EuiText>
                  <EuiCode>{JSON.stringify(command.args, null, 2)}</EuiCode>
                </EuiText>
              );
            };

            if (store.apiResponse) {
              doUiResponse();
            } else {
              await delay();
              doUiResponse();
            }
          })();
        }, [
          command.args,
          command.commandDefinition.name,
          command.input,
          isMounted,
          store.apiResponse,
        ]);

        useEffect(() => {
          if (apiResponse && uiResponse) {
            setStatus('success');
          }
        }, [apiResponse, setStatus, uiResponse]);

        useEffect(() => {
          if (apiResponse && store.apiResponse !== apiResponse) {
            setStore({
              ...store,
              apiResponse,
            });
          }
        }, [apiResponse, setStore, store]);

        if (store.apiResponse) {
          return (
            <div>
              {uiResponse}
              <EuiText>{store.apiResponse as ReactNode}</EuiText>
            </div>
          );
        }

        return null;
      },
      args: {
        one: {
          required: false,
          allowMultiples: false,
          about: 'just one',
        },
      },
    },
    // {
    //   name: 'get-file',
    //   about: 'retrieve a file from the endpoint',
    //   args: {
    //     file: {
    //       required: true,
    //       allowMultiples: false,
    //       about: 'the file path for the file to be retrieved',
    //     },
    //   },
    // },
    // {
    //   name: 'cmd2',
    //   about: 'runs cmd 2',
    //   args: {
    //     file: {
    //       required: true,
    //       allowMultiples: false,
    //       about: 'Includes file in the run',
    //       validate: () => {
    //         return true;
    //       },
    //     },
    //     bad: {
    //       required: false,
    //       allowMultiples: false,
    //       about: 'will fail validation',
    //       validate: () => 'This is a bad value',
    //     },
    //   },
    // },
    // {
    //   name: 'cmd-long-delay',
    //   about: 'runs cmd 2',
    // },
  ];
};

const RunningConsole = memo<{ registeredConsole: RegisteredConsoleClient }>(
  ({ registeredConsole }) => {
    const handleShowOnClick = useCallback(() => {
      registeredConsole.show();
    }, [registeredConsole]);

    const handleTerminateOnClick = useCallback(() => {
      registeredConsole.terminate();
    }, [registeredConsole]);

    return (
      <>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow>{registeredConsole.title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButton onClick={handleTerminateOnClick} color="danger">
                  {'terminate'}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleShowOnClick}>{'show'}</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </>
    );
  }
);
RunningConsole.displayName = 'RunningConsole';

// ------------------------------------------------------------
// FOR DEV PURPOSES ONLY
// FIXME:PT Delete once we have support via row actions menu
// ------------------------------------------------------------
export const ShowDevConsole = memo(() => {
  const consoleManager = useConsoleManager();
  const commands = useMemo(() => {
    return getCommandList();
  }, []);

  const handleRegisterOnClick = useCallback(() => {
    consoleManager
      .register({
        id: Math.random().toString(36), // getId(),
        title: 'Test console here',
        meta: {
          foo: 'bar',
        },
        consoleProps: {
          prompt: '>>',
          commands,
          'data-test-subj': 'dev',
        },
      })
      .show();
  }, [commands, consoleManager]);

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleRegisterOnClick}>{'Open a managed console'}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow>
          {consoleManager.getList<{ foo: string }>().map((registeredConsole) => {
            return (
              <RunningConsole key={registeredConsole.id} registeredConsole={registeredConsole} />
            );
          })}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <EuiText>
        <h3>{'Un-managed console'}</h3>
      </EuiText>
      <EuiPanel style={{ height: '600px' }}>
        <Console prompt="$$>" commands={getCommandList()} data-test-subj="dev" />
      </EuiPanel>
    </EuiPanel>
  );
});
ShowDevConsole.displayName = 'ShowDevConsole';

export const DevConsole = memo(() => {
  const isConsoleEnabled = useIsExperimentalFeatureEnabled('responseActionsConsoleEnabled');
  const {
    urlParams: { showConsole = false },
  } = useUrlParams();

  return isConsoleEnabled && showConsole ? <ShowDevConsole /> : null;
});
DevConsole.displayName = 'DevConsole';
