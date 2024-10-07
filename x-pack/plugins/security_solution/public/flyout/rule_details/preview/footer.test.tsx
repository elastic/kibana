/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID } from './test_ids';
import { PreviewFooter } from './footer';
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RulePanelKey } from '../right';

jest.mock('@kbn/expandable-flyout');

const renderRulePreviewFooter = () => render(<PreviewFooter ruleId="ruleid" />);

describe('<RulePreviewFooter />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should render rule details link correctly when ruleId is available', () => {
    const { getByTestId } = renderRulePreviewFooter();

    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID)).toHaveTextContent(
      'Show full rule details'
    );
  });

  it('should open rule flyout when clicked', () => {
    const { getByTestId } = renderRulePreviewFooter();

    getByTestId(RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID).click();

    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: { id: RulePanelKey, params: { ruleId: 'ruleid' } },
    });
  });
});
