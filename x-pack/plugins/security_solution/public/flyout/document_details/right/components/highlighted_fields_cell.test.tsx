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
import { RightPanelContext } from '../context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { TestProviders } from '../../../../common/mock';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useGetEndpointDetails } from '../../../../management/hooks';
import {
  useAgentStatusHook,
  useGetAgentStatus,
  useGetSentinelOneAgentStatus,
} from '../../../../management/hooks/agents/use_get_agent_status';
import { type ExpandableFlyoutApi, useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../../common/endpoint/service/response_actions/constants';

jest.mock('../../../../management/hooks');
jest.mock('../../../../management/hooks/agents/use_get_agent_status');

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

const useGetSentinelOneAgentStatusMock = useGetSentinelOneAgentStatus as jest.Mock;
const useGetAgentStatusMock = useGetAgentStatus as jest.Mock;
const useAgentStatusHookMock = useAgentStatusHook as jest.Mock;
const hooksToMock: Record<string, jest.Mock> = {
  useGetSentinelOneAgentStatus: useGetSentinelOneAgentStatusMock,
  useGetAgentStatus: useGetAgentStatusMock,
};

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as RightPanelContext;

const renderHighlightedFieldsCell = (values: string[], field: string) =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFieldsCell values={values} field={field} />
      </RightPanelContext.Provider>
    </TestProviders>
  );

describe('<HighlightedFieldsCell />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
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

  it('should open left panel when clicking on the link within a a link cell', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'user.name');

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });

  it('should render agent status cell if field is `agent.status`', () => {
    (useGetEndpointDetails as jest.Mock).mockReturnValue({});
    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell values={['value']} field={'agent.status'} />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  // TODO: 8.15 simplify when `agentStatusClientEnabled` FF is enabled and removed
  it.each(Object.keys(hooksToMock))(
    `should render SentinelOne agent status cell if field is agent.status and 'originalField' is ${RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one} with %s hook`,
    (hookName) => {
      const hook = hooksToMock[hookName];
      useAgentStatusHookMock.mockImplementation(() => hook);

      (hook as jest.Mock).mockReturnValue({
        isFetched: true,
        isLoading: false,
      });

      const { getByTestId } = render(
        <TestProviders>
          <HighlightedFieldsCell
            values={['value']}
            field={'agent.status'}
            originalField={RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one}
          />
        </TestProviders>
      );

      expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
    }
  );
  it.each(Object.keys(hooksToMock))(
    `should render Crowdstrike agent status cell if field is agent.status and 'originalField' is ${RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike} with %s hook`,
    (hookName) => {
      const hook = hooksToMock[hookName];
      useAgentStatusHookMock.mockImplementation(() => hook);

      (hook as jest.Mock).mockReturnValue({
        isFetched: true,
        isLoading: false,
      });

      const { getByTestId } = render(
        <TestProviders>
          <HighlightedFieldsCell
            values={['value']}
            field={'agent.status'}
            originalField={RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike}
          />
        </TestProviders>
      );

      expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
    }
  );
  it('should not render if values is null', () => {
    const { container } = render(
      <TestProviders>
        <HighlightedFieldsCell values={null} field={'field'} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
