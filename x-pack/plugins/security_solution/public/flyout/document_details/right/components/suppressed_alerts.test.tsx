/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  SUMMARY_ROW_TEXT_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
} from './test_ids';
import { SuppressedAlerts } from './suppressed_alerts';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useDocumentDetailsContext } from '../../shared/context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../shared/context');
jest.mock('../../../../../common/detection_engine/utils', () => ({
  isSuppressionRuleInGA: jest.fn().mockReturnValue(false),
}));

const TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);
const BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);

const renderSuppressedAlerts = (alertSuppressionCount: number) =>
  render(
    <IntlProvider locale="en">
      <SuppressedAlerts alertSuppressionCount={alertSuppressionCount} ruleType="query" />
    </IntlProvider>
  );

const mockOpenLeftPanel = jest.fn();
const scopeId = 'scopeId';
const eventId = 'eventId';
const indexName = 'indexName';
const isSuppressionRuleInGAMock = isSuppressionRuleInGA as jest.Mock;

describe('<SuppressedAlerts />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      eventId,
      indexName,
      scopeId,
      isPreviewMode: false,
    });
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
  });

  it('should render single suppressed alert correctly', () => {
    const { getByTestId } = renderSuppressedAlerts(1);

    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Suppressed alert');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('1');
    expect(
      getByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).toBeInTheDocument();
  });

  it('should render multiple suppressed alerts row correctly', () => {
    const { getByTestId } = renderSuppressedAlerts(2);

    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Suppressed alerts');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('2');
  });

  it('should not render Technical Preview badge if rule type is in GA', () => {
    isSuppressionRuleInGAMock.mockReturnValueOnce(true);
    const { queryByTestId } = renderSuppressedAlerts(2);

    expect(
      queryByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('should open the expanded section to the correct tab when the number is clicked', () => {
    const { getByTestId } = renderSuppressedAlerts(1);
    getByTestId(BUTTON_TEST_ID).click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: CORRELATIONS_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });
});
