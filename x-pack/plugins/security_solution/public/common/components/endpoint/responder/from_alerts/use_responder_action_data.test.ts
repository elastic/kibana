/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UseWithResponderActionDataFromAlertProps,
  ResponderActionData,
  UseResponderActionDataProps,
} from './use_responder_action_data';
import {
  useResponderActionData,
  useWithResponderActionDataFromAlert,
} from './use_responder_action_data';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from './translations';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../../../mock/endpoint';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../../common/endpoint/constants';
import { endpointMetadataHttpMocks } from '../../../../../management/pages/endpoint_hosts/mocks';
import type { RenderHookResult } from '@testing-library/react-hooks/src/types';
import { createHttpFetchError } from '@kbn/core-http-browser-mocks';
import { HostStatus } from '../../../../../../common/endpoint/types';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { getAgentTypeName } from '../../../../translations';
import { ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD } from '../../../../hooks/endpoint/use_alert_response_actions_support';

describe('use responder action data hooks', () => {
  let appContextMock: AppContextTestRender;
  let onClickMock: UseWithResponderActionDataFromAlertProps['onClick'];

  const getExpectedResponderActionData = (
    overrides: Partial<ResponderActionData> = {}
  ): ResponderActionData => {
    return {
      isDisabled: false,
      tooltip: undefined,
      handleResponseActionsClick: expect.any(Function),
      ...overrides,
    };
  };

  beforeEach(() => {
    appContextMock = createAppRootMockRenderer();
    onClickMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useWithResponderActionDataFromAlert() hook', () => {
    let renderHook: () => RenderHookResult<
      UseWithResponderActionDataFromAlertProps,
      ResponderActionData
    >;
    let alertDetailItemData: TimelineEventsDetailsItem[];

    beforeEach(() => {
      renderHook = () => {
        return appContextMock.renderHook<
          UseWithResponderActionDataFromAlertProps,
          ResponderActionData
        >(() =>
          useWithResponderActionDataFromAlert({
            eventData: alertDetailItemData,
            onClick: onClickMock,
          })
        );
      };
    });

    describe('Common behaviours', () => {
      it('should show action as disabled if agent does not support response actions', () => {
        alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo');

        expect(renderHook().result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: NOT_FROM_ENDPOINT_HOST_TOOLTIP,
          })
        );
      });

      it('should call `onClick()` function prop when is pass to the hook', () => {
        alertDetailItemData = endpointAlertDataMock.generateSentinelOneAlertDetailsItemData();
        const { result } = renderHook();
        result.current.handleResponseActionsClick();

        expect(onClickMock).toHaveBeenCalled();
      });

      it('should NOT call `onClick` if the action is disabled', () => {
        alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo');
        const { result } = renderHook();
        result.current.handleResponseActionsClick();

        expect(onClickMock).not.toHaveBeenCalled();
      });
    });

    describe('and agentType is NOT Endpoint', () => {
      beforeEach(() => {
        alertDetailItemData = endpointAlertDataMock.generateSentinelOneAlertDetailsItemData();
      });

      it('should show action when agentType is supported', () => {
        expect(renderHook().result.current).toEqual(getExpectedResponderActionData());
      });

      it('should NOT call the endpoint host metadata api', () => {
        renderHook();
        const wasMetadataApiCalled = appContextMock.coreStart.http.get.mock.calls.some(([path]) => {
          return (path as unknown as string).includes(HOST_METADATA_LIST_ROUTE);
        });

        expect(wasMetadataApiCalled).toBe(false);
      });

      it.each([...RESPONSE_ACTION_AGENT_TYPE])(
        'should show action disabled with tooltip for %s if agent id field is missing',
        (agentType) => {
          alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(
            agentType,
            {
              [RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD[agentType]]: undefined,
            }
          );

          expect(renderHook().result.current).toEqual(
            getExpectedResponderActionData({
              isDisabled: true,
              tooltip: ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD(
                getAgentTypeName(agentType),
                RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD[agentType]
              ),
            })
          );
        }
      );
    });

    describe('and agentType IS Endpoint', () => {
      let metadataApiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

      beforeEach(() => {
        alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();
        metadataApiMocks = endpointMetadataHttpMocks(appContextMock.coreStart.http);
      });

      it('should show action disabled with tooltip while retrieving host metadata', () => {
        expect(renderHook().result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: LOADING_ENDPOINT_DATA_TOOLTIP,
          })
        );
      });

      it('should show action enabled if host metadata was retrieved and host is enrolled', async () => {
        const { result, waitForValueToChange } = renderHook();
        await waitForValueToChange(() => result.current.isDisabled);

        expect(result.current).toEqual(getExpectedResponderActionData());
      });

      it('should show action disabled if host was not found', async () => {
        metadataApiMocks.responseProvider.metadataDetails.mockImplementation(() => {
          throw createHttpFetchError('Not found', undefined, undefined, undefined, {
            statusCode: 404,
          });
        });
        const { result, waitForValueToChange } = renderHook();
        await waitForValueToChange(() => result.current.tooltip);

        expect(result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: NOT_FROM_ENDPOINT_HOST_TOOLTIP,
          })
        );
      });

      it('should show action as disabled with tooltip when host is found, but has a status of unenrolled', async () => {
        const hostMetadata = {
          ...metadataApiMocks.responseProvider.metadataDetails(),
          host_status: HostStatus.UNENROLLED,
        };
        metadataApiMocks.responseProvider.metadataDetails.mockReturnValue(hostMetadata);

        const { result, waitForValueToChange } = renderHook();
        await waitForValueToChange(() => result.current.tooltip);

        expect(result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: HOST_ENDPOINT_UNENROLLED_TOOLTIP,
          })
        );
      });

      it('should show action disabled if a metadata API error was encountered', async () => {
        metadataApiMocks.responseProvider.metadataDetails.mockImplementation(() => {
          throw createHttpFetchError('Server error', undefined, undefined, undefined, {
            statusCode: 500,
          });
        });
        const { result, waitForValueToChange } = renderHook();
        await waitForValueToChange(() => result.current.tooltip);

        expect(result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: METADATA_API_ERROR_TOOLTIP,
          })
        );
      });
    });
  });

  describe('useResponderActionData() hook', () => {
    let hookProps: UseResponderActionDataProps;
    let renderHook: () => RenderHookResult<UseResponderActionDataProps, ResponderActionData>;

    beforeEach(() => {
      endpointMetadataHttpMocks(appContextMock.coreStart.http);
      hookProps = {
        agentId: 'agent-123',
        agentType: 'endpoint',
        onClick: onClickMock,
      };
      renderHook = () => {
        return appContextMock.renderHook<UseResponderActionDataProps, ResponderActionData>(() =>
          useResponderActionData(hookProps)
        );
      };
    });

    it('should show action enabled when agentType is Endpoint and host is enabled', async () => {
      const { result, waitForValueToChange } = renderHook();
      await waitForValueToChange(() => result.current.isDisabled);

      expect(result.current).toEqual(getExpectedResponderActionData());
    });

    it('should show action disabled if agent type is not Endpoint', () => {
      hookProps.agentType = 'crowdstrike';

      expect(renderHook().result.current).toEqual(
        getExpectedResponderActionData({
          isDisabled: true,
          tooltip: NOT_FROM_ENDPOINT_HOST_TOOLTIP,
        })
      );
    });

    it('should call `onClick` prop when action is enabled', async () => {
      const { result, waitForValueToChange } = renderHook();
      await waitForValueToChange(() => result.current.isDisabled);
      result.current.handleResponseActionsClick();

      expect(onClickMock).toHaveBeenCalled();
    });

    it('should not call `onCLick` prop when action is disabled', () => {
      hookProps.agentType = 'sentinel_one';
      const { result } = renderHook();
      result.current.handleResponseActionsClick();

      expect(onClickMock).not.toHaveBeenCalled();
    });
  });
});
