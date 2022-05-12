/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, screen } from '@testing-library/react';

import '../../common/mock/match_media';
import { usePushToService, ReturnUsePushToService, UsePushToService } from '.';
import { TestProviders } from '../../common/mock';
import { CaseStatuses, ConnectorTypes } from '../../../common/api';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { basicPush, actionLicenses, connectorsMock } from '../../containers/mock';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { CLOSED_CASE_PUSH_ERROR_ID } from './callout/types';
import * as i18n from './translations';

jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/configure/api');
jest.mock('../../common/navigation/hooks');

describe('usePushToService', () => {
  const caseId = '12345';
  const updateCase = jest.fn();
  const onEditClick = jest.fn();
  const pushCaseToExternalService = jest.fn();
  const mockPostPush = {
    isLoading: false,
    pushCaseToExternalService,
  };

  const mockConnector = connectorsMock[0];
  const actionLicense = actionLicenses[0];
  const caseServices = {
    '123': {
      ...basicPush,
      firstPushIndex: 0,
      lastPushIndex: 0,
      commentsToUpdate: [],
      hasDataToPush: true,
    },
  };

  const defaultArgs = {
    actionsErrors: [],
    connector: {
      id: mockConnector.id,
      name: mockConnector.name,
      type: ConnectorTypes.serviceNowITSM,
      fields: null,
    },
    caseId,
    caseServices,
    caseStatus: CaseStatuses.open,
    configureCasesNavigation: {
      href: 'href',
      onClick: jest.fn(),
    },
    connectors: connectorsMock,
    hasDataToPush: true,
    onEditClick,
    isValidConnector: true,
    updateCase,
    userCanCrud: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePostPushToService as jest.Mock).mockImplementation(() => mockPostPush);
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense,
    }));
  });

  it('push case button posts the push with correct args', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.pushButton.props.children.props.onClick();
      expect(pushCaseToExternalService).toBeCalledWith({
        caseId,
        connector: {
          fields: null,
          id: 'servicenow-1',
          name: 'My Connector',
          type: ConnectorTypes.serviceNowITSM,
        },
      });
      expect(result.current.pushCallouts).toBeNull();
    });
  });

  it('Displays message when user does not have premium license', async () => {
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense: {
        ...actionLicense,
        enabledInLicense: false,
      },
    }));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('license-error');
    });
  });

  it('Displays message when user does not have case enabled in config', async () => {
    (useGetActionLicense as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      actionLicense: {
        ...actionLicense,
        enabledInConfig: false,
      },
    }));

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () => usePushToService(defaultArgs),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('kibana-config-error');
    });
  });

  it('Displays message when user does not have any connector configured', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            connectors: [],
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      render(result.current.pushCallouts ?? <></>);
      // getByText will thrown an error if the element is not found.
      screen.getByText(i18n.CONFIGURE_CONNECTOR);

      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
    });
  });

  it('Displays message when user does have a connector but is configured to none', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      await waitForNextUpdate();

      render(result.current.pushCallouts ?? <></>);
      // getByText will thrown an error if the element is not found.
      screen.getByText(i18n.CONFIGURE_CONNECTOR);

      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
    });
  });

  it('Displays message when connector is deleted', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            connector: {
              id: 'not-exist',
              name: 'not-exist',
              type: ConnectorTypes.none,
              fields: null,
            },
            isValidConnector: false,
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('connector-deleted-error');
    });
  });

  it('Displays message when connector is deleted with empty connectors', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            connectors: [],
            connector: {
              id: 'not-exist',
              name: 'not-exist',
              type: ConnectorTypes.none,
              fields: null,
            },
            isValidConnector: false,
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('connector-deleted-error');
    });
  });

  it('Displays message when case is closed', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            caseStatus: CaseStatuses.closed,
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual(CLOSED_CASE_PUSH_ERROR_ID);
    });
  });

  describe('user does not have write permissions', () => {
    const noWriteProps = { ...defaultArgs, userCanCrud: false };

    it('does not display a message when user does not have a premium license', async () => {
      (useGetActionLicense as jest.Mock).mockImplementation(() => ({
        isLoading: false,
        actionLicense: {
          ...actionLicense,
          enabledInLicense: false,
        },
      }));
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () => usePushToService(noWriteProps),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when user does not have case enabled in config', async () => {
      (useGetActionLicense as jest.Mock).mockImplementation(() => ({
        isLoading: false,
        actionLicense: {
          ...actionLicense,
          enabledInConfig: false,
        },
      }));
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () => usePushToService(noWriteProps),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when user does not have any connector configured', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () =>
            usePushToService({
              ...noWriteProps,
              connectors: [],
              connector: {
                id: 'none',
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              },
            }),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when user does have a connector but is configured to none', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () =>
            usePushToService({
              ...noWriteProps,
              connector: {
                id: 'none',
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              },
            }),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when connector is deleted', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () =>
            usePushToService({
              ...noWriteProps,
              connector: {
                id: 'not-exist',
                name: 'not-exist',
                type: ConnectorTypes.none,
                fields: null,
              },
              isValidConnector: false,
            }),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when connector is deleted with empty connectors', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () =>
            usePushToService({
              ...noWriteProps,
              connectors: [],
              connector: {
                id: 'not-exist',
                name: 'not-exist',
                type: ConnectorTypes.none,
                fields: null,
              },
              isValidConnector: false,
            }),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });

    it('does not display a message when case is closed', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
          () =>
            usePushToService({
              ...noWriteProps,
              caseStatus: CaseStatuses.closed,
            }),
          {
            wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.pushCallouts).toBeNull();
      });
    });
  });
});
