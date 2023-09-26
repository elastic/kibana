/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { DESCRIPTION_TITLE_TEST_ID, RULE_SUMMARY_BUTTON_TEST_ID } from './test_ids';
import { Description } from './description';
import { RightPanelContext } from '../context';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
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

const panelContextValue = (dataFormattedForFieldBrowser: TimelineEventsDetailsItem[]) =>
  ({
    eventId: 'event id',
    indexName: 'indexName',
    scopeId: 'scopeId',
    dataFormattedForFieldBrowser,
    getFieldsData: mockGetFieldsData,
  } as unknown as RightPanelContext);

const renderDescription = (panelContext: RightPanelContext) =>
  render(
    <IntlProvider locale="en">
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContext}>
          <Description />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </IntlProvider>
  );

describe('<Description />', () => {
  it('should render the component', () => {
    const { getByTestId } = renderDescription(
      panelContextValue([ruleUuid, ruleDescription, ruleName])
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent('Rule description');
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render rule preview button if rule name is not available', () => {
    const { getByTestId, queryByTestId } = renderDescription(
      panelContextValue([ruleUuid, ruleDescription])
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent('Rule description');
    expect(queryByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render document title if document is not an alert', () => {
    const { getByTestId } = renderDescription(panelContextValue([ruleDescription]));

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent('Document description');
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
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.about.description.rulePreviewTitle"
              defaultMessage="Preview rule details"
            />
          ),
          backgroundColor: 'warning',
          textColor: 'warning',
        },
        ruleId: ruleUuid.values[0],
      },
    });
  });
});
