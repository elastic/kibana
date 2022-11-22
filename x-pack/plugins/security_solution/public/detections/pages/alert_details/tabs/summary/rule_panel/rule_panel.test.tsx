/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ALERT_RISK_SCORE, ALERT_RULE_DESCRIPTION, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { TestProviders } from '../../../../../../common/mock';
import {
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from '../../../__mocks__';
import type { RulePanelProps } from '.';
import { RulePanel } from '.';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';

describe('AlertDetailsPage - SummaryTab - RulePanel', () => {
  const RulePanelWithDefaultProps = (propOverrides: Partial<RulePanelProps>) => (
    <TestProviders>
      <RulePanel
        data={mockAlertDetailsTimelineResponse}
        id={mockAlertNestedDetailsTimelineResponse._id}
        browserFields={mockBrowserFields}
        {...propOverrides}
      />
    </TestProviders>
  );
  it('should render basic rule fields', () => {
    const { getByTestId } = render(<RulePanelWithDefaultProps />);
    const simpleRuleFields = [ALERT_RISK_SCORE, ALERT_RULE_DESCRIPTION];

    simpleRuleFields.forEach((simpleRuleField) => {
      expect(getByTestId('rule-panel')).toHaveTextContent(
        getTimelineEventData(simpleRuleField, mockAlertDetailsTimelineResponse)
      );
    });
  });

  it('should render the expected severity', () => {
    const { getByTestId } = render(<RulePanelWithDefaultProps />);
    expect(getByTestId('rule-panel-severity')).toHaveTextContent('Medium');
  });

  describe('Rule name link', () => {
    it('should render the rule name as a link button', () => {
      const { getByTestId } = render(<RulePanelWithDefaultProps />);
      const ruleName = getTimelineEventData(ALERT_RULE_NAME, mockAlertDetailsTimelineResponse);
      expect(getByTestId('ruleName')).toHaveTextContent(ruleName);
    });
  });
});
