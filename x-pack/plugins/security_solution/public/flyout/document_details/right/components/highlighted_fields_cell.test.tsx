/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';
import { HighlightedFieldsCell } from './highlighted_fields_cell';
import { DocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { TestProviders } from '../../../../common/mock';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useGetAgentStatus } from '../../../../management/hooks/agents/use_get_agent_status';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from './host_entity_overview';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from './user_entity_overview';

jest.mock('../../../../management/hooks');
jest.mock('../../../../management/hooks/agents/use_get_agent_status');

jest.mock('@kbn/expandable-flyout');

const useGetAgentStatusMock = useGetAgentStatus as jest.Mock;

jest.mock('../../../../common/hooks/use_experimental_features');
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as DocumentDetailsContext;

const renderHighlightedFieldsCell = (values: string[], field: string) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <HighlightedFieldsCell values={values} field={field} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<HighlightedFieldsCell />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
  });

  it('should render a basic cell', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell values={['value']} field={'field'} />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render a link cell if field is `host.name`', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'host.name');

    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render a link cell if field is `user.name`', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'user.name');

    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should open left panel when clicking on the link within a a link cell when feature flag is off', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'user.name');

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });

  it('should open host preview when click on host when feature flag is on', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const { getByTestId } = renderHighlightedFieldsCell(['test host'], 'host.name');

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName: 'test host',
        scopeId: panelContextValue.scopeId,
        banner: HOST_PREVIEW_BANNER,
      },
    });
  });

  it('should open user preview when click on user when feature flag is on', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const { getByTestId } = renderHighlightedFieldsCell(['test user'], 'user.name');

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: UserPreviewPanelKey,
      params: {
        userName: 'test user',
        scopeId: panelContextValue.scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });
  });

  it('should render agent status cell if field is `agent.status`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });
    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell values={['value']} field={'agent.status'} />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render SentinelOne agent status cell if field is agent.status and `originalField` is `observer.serial_number`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell
          values={['value']}
          field={'agent.status'}
          originalField="observer.serial_number"
        />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render Crowdstrike agent status cell if field is agent.status and `originalField` is `crowdstrike.event.DeviceId`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell
          values={['value']}
          field={'agent.status'}
          originalField="crowdstrike.event.DeviceId"
        />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });
  it('should not render if values is null', () => {
    const { container } = render(
      <TestProviders>
        <HighlightedFieldsCell values={null} field={'field'} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
