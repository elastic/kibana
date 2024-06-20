/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseHostIsolationActionProps } from './use_host_isolation_action';
import { useHostIsolationAction } from './use_host_isolation_action';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../../../mock/endpoint';
import { agentStatusGetHttpMock } from '../../../../../management/mocks';

describe('useHostIsolationAction', () => {
  let appContextMock: AppContextTestRender;
  let hookProps: UseHostIsolationActionProps;
  let apiMock: ReturnType<typeof agentStatusGetHttpMock>;

  const render = () => {
    return appContextMock.renderHook(() => useHostIsolationAction(hookProps));
  };

  beforeEach(() => {
    appContextMock = createAppRootMockRenderer();
    appContextMock.setExperimentalFlag({
      responseActionsSentinelOneV1Enabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    });
    hookProps = {
      closePopover: jest.fn(),
      detailsData: endpointAlertDataMock.generateEndpointAlertDetailsItemData(),
      isHostIsolationPanelOpen: false,
      onAddIsolationStatusClick: jest.fn(),
    };
    apiMock = agentStatusGetHttpMock(appContextMock.coreStart.http);
  });

  it('should return menu item for display', () => {
    const { result } = render();

    expect(result.current).toEqual(['foo']);
  });

  it.todo('should call `closePopover` callback when menu item `onClick` is called');

  it('should NOT return the menu item for Events', () => {
    hookProps.detailsData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo', {
      'kibana.alert.rule.uuid': undefined,
    });
    const { result } = render();

    expect(result.current).toHaveLength(0);
  });

  it.todo('should NOT return menu item if user does not have authz');

  it.todo('should NOT attempt to get Agent status if host does not support response actions');

  it.todo('should return disabled menu item when host does not support isolation');

  it.todo('should return disabled menu item while loading agent status');

  it.todo('should return disabled menu item if host agent is unenrolled');
});
