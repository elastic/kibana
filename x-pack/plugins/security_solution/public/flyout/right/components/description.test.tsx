/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DESCRIPTION_TITLE_TEST_ID, RULE_SUMMARY_BUTTON_TEST_ID } from './test_ids';
import {
  DOCUMENT_DESCRIPTION_TITLE,
  PREVIEW_RULE_DETAILS,
  RULE_DESCRIPTION_TITLE,
} from './translations';
import { Description } from './description';
import { RightPanelContext } from '../context';
import { mockGetFieldsData } from '../mocks/mock_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { PreviewPanelKey } from '../../preview';

const ruleUuid = {
  category: 'kibana',
  field: 'kibana.alert.rule.uuid',
  values: ['123'],
  originalValue: ['123'],
  isObjectArray: false,
};
const ruleDescription = {
  category: 'kibana',
  field: 'kibana.alert.rule.description',
  values: [
    'This is a very long description of the rule. In theory. this description is long enough that it should be cut off when displayed in collapsed mode.',
  ],
  originalValue: ['description'],
  isObjectArray: false,
};
const ruleName = {
  category: 'kibana',
  field: 'kibana.alert.rule.name',
  values: ['rule-name'],
  originalValue: ['rule-name'],
  isObjectArray: false,
};

const flyoutContextValue = {
  openPreviewPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const panelContextValue = (dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null) =>
  ({
    eventId: 'event id',
    indexName: 'indexName',
    scopeId: 'scopeId',
    dataFormattedForFieldBrowser,
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext);

const renderDescription = (panelContext: RightPanelContext) =>
  render(
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContext}>
        <Description />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );

describe('<Description />', () => {
  it('should render the component', () => {
    const { getByTestId } = renderDescription(
      panelContextValue([ruleUuid, ruleDescription, ruleName])
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(RULE_DESCRIPTION_TITLE);
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render rule preview button if rule name is not available', () => {
    const { getByTestId, queryByTestId } = renderDescription(
      panelContextValue([ruleUuid, ruleDescription])
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(RULE_DESCRIPTION_TITLE);
    expect(queryByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render document title if document is not an alert', () => {
    const { getByTestId } = renderDescription(panelContextValue([ruleDescription]));

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(DOCUMENT_DESCRIPTION_TITLE);
  });

  it('should render null if dataFormattedForFieldBrowser is null', () => {
    const panelContext = {
      ...panelContextValue([ruleUuid, ruleDescription, ruleName]),
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;

    const { container } = renderDescription(panelContext);

    expect(container).toBeEmptyDOMElement();
  });

  it('should open preview panel when clicking on button', () => {
    const panelContext = panelContextValue([ruleUuid, ruleDescription, ruleName]);

    const { getByTestId } = renderDescription(panelContext);

    getByTestId(RULE_SUMMARY_BUTTON_TEST_ID).click();

    expect(flyoutContextValue.openPreviewPanel).toHaveBeenCalledWith({
      id: PreviewPanelKey,
      path: { tab: 'rule-preview' },
      params: {
        id: panelContext.eventId,
        indexName: panelContext.indexName,
        scopeId: panelContext.scopeId,
        banner: {
          title: PREVIEW_RULE_DETAILS,
          backgroundColor: 'warning',
          textColor: 'warning',
        },
        ruleId: ruleUuid.values[0],
      },
    });
  });
});
