/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponderContextMenuItemProps,
  ResponderActionData,
} from './use_responder_action_data';
import { useWithResponderActionDataFromAlert } from './use_responder_action_data';
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

// import { useAlertResponseActionsSupport as _useAlertResponseActionsSupport } from '../../../../hooks/endpoint/use_alert_response_actions_support';

// const useAlertResponseActionsSupportMock = _useAlertResponseActionsSupport as jest.Mock;

// FIXME:PT cleanup
//
// jest.mock('../../../../hooks/use_experimental_features');
// jest.mock('../../../../../management/hooks', () => ({
//   useGetEndpointDetails: (jest.fn() as jest.Mock).mockImplementation(() => ({ enabled: false })),
//   useWithShowResponder: jest.fn(),
// }));

// const useGetEndpointDetailsMock = useGetEndpointDetails as jest.Mock;
// const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

// FIXME:PT fix tests
// FIXME:PT move the tests under `x-pack/plugins/security_solution/public/detections/components/take_action_dropdown/index.test.tsx` here

describe('use responder action data hooks', () => {
  let appContextMock: AppContextTestRender;
  let renderHook: () => RenderHookResult<ResponderContextMenuItemProps, ResponderActionData>;

  beforeEach(() => {
    appContextMock = createAppRootMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useWithResponderActionDataFromAlert() hook', () => {
    let alertDetailItemData: TimelineEventsDetailsItem[];
    let onClickMock: ResponderContextMenuItemProps['onClick'];

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
      onClickMock = jest.fn();

      renderHook = () => {
        return appContextMock.renderHook<ResponderContextMenuItemProps, ResponderActionData>(() =>
          useWithResponderActionDataFromAlert({
            eventData: alertDetailItemData,
            onClick: onClickMock,
          })
        );
      };
    });

    describe('and agentType is NOT Endpoint', () => {
      beforeEach(() => {
        alertDetailItemData = endpointAlertDataMock.generateSentinelOneAlertDetailsItemData();
      });

      it('should show action when agentType is supported', () => {
        expect(renderHook().result.current).toEqual(getExpectedResponderActionData());
      });

      it('should show action as disabled if agent does not support response actions', () => {
        alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo');

        expect(renderHook().result.current).toEqual(
          getExpectedResponderActionData({
            isDisabled: true,
            tooltip: NOT_FROM_ENDPOINT_HOST_TOOLTIP,
          })
        );
      });

      it('should NOT call the endpoint host metadata api', () => {
        renderHook();
        const wasMetadataApiCalled = appContextMock.coreStart.http.get.mock.calls.some(([path]) => {
          return (path as unknown as string).includes(HOST_METADATA_LIST_ROUTE);
        });

        expect(wasMetadataApiCalled).toBe(false);
      });
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

  // describe('useResponderActionData() hook', () => {
  //   // FIXME:PT implement and fix
  //
  //   it('should return `responder` menu item as `disabled` if agentType is not `endpoint` and feature flag is enabled', () => {
  //     const { result } = renderHook(() =>
  //       useResponderActionData({
  //         endpointId: 'some-agent-type-id',
  //         // @ts-expect-error this is for testing purpose
  //         agentType: 'some_agent_type',
  //         eventData: [],
  //       })
  //     );
  //     expect(result.current.isDisabled).toEqual(true);
  //   });
  //
  //   describe('when agentType is `endpoint`', () => {
  //     it.each(Object.values(HostStatus).filter((status) => status !== 'unenrolled'))(
  //       'should return `responder` menu item as `enabled `if agentType is `endpoint` when endpoint is %s',
  //       (hostStatus) => {
  //         useGetEndpointDetailsMock.mockReturnValue({
  //           data: {
  //             host_status: hostStatus,
  //           },
  //           isFetching: false,
  //           error: undefined,
  //         });
  //         const { result } = renderHook(() =>
  //           useResponderActionData({
  //             endpointId: 'endpoint-id',
  //             agentType: 'endpoint',
  //           })
  //         );
  //         expect(result.current.isDisabled).toEqual(false);
  //       }
  //     );
  //
  //     it('should return responder menu item `disabled` if agentType is `endpoint` when endpoint is `unenrolled`', () => {
  //       useGetEndpointDetailsMock.mockReturnValue({
  //         data: {
  //           host_status: 'unenrolled',
  //         },
  //         isFetching: false,
  //         error: undefined,
  //       });
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'endpoint-id',
  //           agentType: 'endpoint',
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //     });
  //
  //     it('should return responder menu item `disabled` if agentType is `endpoint` when endpoint data has error', () => {
  //       useGetEndpointDetailsMock.mockReturnValue({
  //         data: {
  //           host_status: 'online',
  //         },
  //         isFetching: false,
  //         error: new Error('uh oh!'),
  //       });
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'endpoint-id',
  //           agentType: 'endpoint',
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //     });
  //
  //     it('should return responder menu item `disabled` if agentType is `endpoint` and endpoint data is fetching', () => {
  //       useGetEndpointDetailsMock.mockReturnValue({
  //         data: undefined,
  //         isFetching: true,
  //         error: undefined,
  //       });
  //
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'endpoint-id',
  //           agentType: 'endpoint',
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //     });
  //
  //     it('should return responder menu item `disabled` when agentType is `endpoint` but no endpoint id is provided', () => {
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: '',
  //           agentType: 'endpoint',
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //       expect(result.current.tooltip).toEqual(HOST_ENDPOINT_UNENROLLED_TOOLTIP);
  //     });
  //   });
  //
  //   describe('when agentType is `sentinel_one`', () => {
  //     const createEventDataMock = (): TimelineEventsDetailsItem[] => {
  //       return [
  //         {
  //           category: 'observer',
  //           field: 'observer.serial_number',
  //           values: ['c06d63d9-9fa2-046d-e91e-dc94cf6695d8'],
  //           originalValue: ['c06d63d9-9fa2-046d-e91e-dc94cf6695d8'],
  //           isObjectArray: false,
  //         },
  //       ];
  //     };
  //
  //     it('should return `responder` menu item as `disabled` if agentType is `sentinel_one` and feature flag is disabled', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
  //
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'sentinel-one-id',
  //           agentType: 'sentinel_one',
  //           eventData: createEventDataMock(),
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //     });
  //
  //     it('should return responder menu item as disabled with tooltip if agent id property is missing from event data', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'sentinel-one-id',
  //           agentType: 'sentinel_one',
  //           eventData: [],
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //       expect(result.current.tooltip).toEqual(
  //         'Event data missing SentinelOne agent identifier (observer.serial_number)'
  //       );
  //     });
  //
  //     it('should return `responder` menu item as `enabled `if agentType is `sentinel_one` and feature flag is enabled', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'sentinel-one-id',
  //           agentType: 'sentinel_one',
  //           eventData: createEventDataMock(),
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(false);
  //     });
  //   });
  //   describe('when agentType is `crowdstrike`', () => {
  //     const createEventDataMock = (): TimelineEventsDetailsItem[] => {
  //       return [
  //         {
  //           category: 'crowdstrike',
  //           field: 'crowdstrike.event.DeviceId',
  //           values: ['mockedAgentId'],
  //           originalValue: ['mockedAgentId'],
  //           isObjectArray: false,
  //         },
  //       ];
  //     };
  //
  //     it('should return `responder` menu item as `disabled` if agentType is `crowdstrike` and feature flag is disabled', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
  //
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'crowdstrike-id',
  //           agentType: 'crowdstrike',
  //           eventData: createEventDataMock(),
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //     });
  //
  //     it('should return responder menu item as disabled with tooltip if agent id property is missing from event data', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'crowdstrike-id',
  //           agentType: 'crowdstrike',
  //           eventData: [],
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(true);
  //       expect(result.current.tooltip).toEqual(
  //         'Event data missing Crowdstrike agent identifier (crowdstrike.event.DeviceId)'
  //       );
  //     });
  //
  //     it('should return `responder` menu item as `enabled `if agentType is `crowdstrike` and feature flag is enabled', () => {
  //       useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  //       const { result } = renderHook(() =>
  //         useResponderActionData({
  //           endpointId: 'crowdstrike-id',
  //           agentType: 'crowdstrike',
  //           eventData: createEventDataMock(),
  //         })
  //       );
  //       expect(result.current.isDisabled).toEqual(false);
  //     });
  //   });
  // });
});
