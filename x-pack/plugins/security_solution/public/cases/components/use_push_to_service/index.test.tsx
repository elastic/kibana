/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePushToService, ReturnUsePushToService, UsePushToService } from '.';
import { TestProviders } from '../../../common/mock';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { basicPush, actionLicenses } from '../../containers/mock';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { connectorsMock } from '../../containers/configure/mock';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../common/components/link_to');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/configure/api');

describe('usePushToService', () => {
  const caseId = '12345';
  const updateCase = jest.fn();
  const postPushToService = jest.fn();
  const mockPostPush = {
    isLoading: false,
    postPushToService,
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
    caseConnectorId: mockConnector.id,
    caseConnectorName: mockConnector.name,
    caseId,
    caseServices,
    caseStatus: 'open',
    connectors: connectorsMock,
    updateCase,
    userCanCrud: true,
    isValidConnector: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
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
      expect(postPushToService).toBeCalledWith({
        caseId,
        caseServices,
        connectorId: mockConnector.id,
        connectorName: mockConnector.name,
        updateCase,
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
            caseConnectorId: 'none',
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('connector-missing-error');
    });
  });

  it('Displays message when user does have a connector but is configured to none', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            caseConnectorId: 'none',
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('connector-not-selected-error');
    });
  });

  it('Displays message when connector is deleted', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UsePushToService, ReturnUsePushToService>(
        () =>
          usePushToService({
            ...defaultArgs,
            caseConnectorId: 'not-exist',
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
            caseConnectorId: 'not-exist',
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
            caseStatus: 'closed',
          }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      const errorsMsg = result.current.pushCallouts?.props.messages;
      expect(errorsMsg).toHaveLength(1);
      expect(errorsMsg[0].id).toEqual('closed-case-push-error');
    });
  });
});
