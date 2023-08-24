/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InvestigationGuideView } from './investigation_guide_view';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const defaultProps = {
  data: [
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      values: ['rule-uuid'],
      originalValue: ['rule-uuid'],
      isObjectArray: false,
    },
  ],
};

describe('Investigation guide view', () => {
  it('should render title and clamped investigation guide (with read more/read less) by default', () => {
    mockUseRuleWithFallback.mockReturnValue({ rule: { note: 'test note' } });

    const { getByTestId, queryByTestId } = render(<InvestigationGuideView {...defaultProps} />);

    expect(getByTestId('summary-view-guide')).toBeInTheDocument();
    expect(getByTestId('investigation-guide-clamped')).toBeInTheDocument();
    expect(queryByTestId('investigation-guide-full-view')).not.toBeInTheDocument();
  });

  it('should render full investigation guide when showFullView is true', () => {
    mockUseRuleWithFallback.mockReturnValue({ rule: { note: 'test note' } });

    const { getByTestId, queryByTestId } = render(
      <InvestigationGuideView {...defaultProps} showFullView={true} />
    );
    expect(getByTestId('investigation-guide-full-view')).toBeInTheDocument();
    expect(getByTestId('investigation-guide-full-view')).toHaveTextContent('test note');
    expect(queryByTestId('investigation-guide-clamped')).not.toBeInTheDocument();
  });

  it('should not render investigation guide when rule id is not available', () => {
    const { queryByTestId } = render(<InvestigationGuideView {...defaultProps} data={[]} />);
    expect(queryByTestId('investigation-guide-clamped')).not.toBeInTheDocument();
    expect(queryByTestId('investigation-guide-full-view')).not.toBeInTheDocument();
  });

  it('should not render investigation guide button when investigation guide is not available', () => {
    mockUseRuleWithFallback.mockReturnValue({ rule: {} });
    const { queryByTestId } = render(<InvestigationGuideView {...defaultProps} />);
    expect(queryByTestId('investigation-guide-clamped')).not.toBeInTheDocument();
    expect(queryByTestId('investigation-guide-full-view')).not.toBeInTheDocument();
  });

  it('should not render investigation guide title when showTitle is false', () => {
    const { queryByTestId } = render(
      <InvestigationGuideView {...defaultProps} showTitle={false} />
    );
    expect(queryByTestId('summary-view-guide')).not.toBeInTheDocument();
  });
});
