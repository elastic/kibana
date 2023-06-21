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
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import { TestProviders } from '../../../common/mock';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;
const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as RightPanelContext;

const renderHighlightedFieldsCell = (values: string[], field: string) =>
  render(
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFieldsCell values={values} field={field} />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );

describe('<HighlightedFieldsCell />', () => {
  it('should render a basic cell', () => {
    const { getByTestId } = render(<HighlightedFieldsCell values={['value']} field={'field'} />);

    expect(getByTestId(HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render a link cell if field is host.name', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'host.name');

    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render a link cell if field is user.name', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'user.name');

    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should open left panel when clicking on the link within a a link cell', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['value'], 'user.name');

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });

  it('should render agent status cell if field is agent.status', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HighlightedFieldsCell values={['value']} field={'agent.status'} />
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render agent status component if override field is agent.status', () => {
    const { container } = render(<HighlightedFieldsCell values={null} field={'field'} />);

    expect(container).toBeEmptyDOMElement();
  });
});
