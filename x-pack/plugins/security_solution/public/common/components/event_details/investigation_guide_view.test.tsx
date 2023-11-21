/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InvestigationGuideView } from './investigation_guide_view';
import type { GetBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';

const defaultProps = {
  basicData: {
    ruleId: 'rule-id',
  } as unknown as GetBasicDataFromDetailsData,
  ruleNote: 'test note',
};

describe('Investigation guide view', () => {
  it('should render title and clamped investigation guide (with read more/read less) by default', () => {
    const { getByTestId, queryByTestId } = render(<InvestigationGuideView {...defaultProps} />);

    expect(getByTestId('summary-view-guide')).toBeInTheDocument();
    expect(getByTestId('investigation-guide-clamped')).toBeInTheDocument();
    expect(queryByTestId('investigation-guide-full-view')).not.toBeInTheDocument();
  });

  it('should render full investigation guide when showFullView is true', () => {
    const { getByTestId, queryByTestId } = render(
      <InvestigationGuideView {...defaultProps} showFullView={true} />
    );
    expect(getByTestId('investigation-guide-full-view')).toBeInTheDocument();
    expect(getByTestId('investigation-guide-full-view')).toHaveTextContent('test note');
    expect(queryByTestId('investigation-guide-clamped')).not.toBeInTheDocument();
  });

  it('should not render investigation guide title when showTitle is false', () => {
    const { queryByTestId } = render(
      <InvestigationGuideView {...defaultProps} showTitle={false} />
    );
    expect(queryByTestId('summary-view-guide')).not.toBeInTheDocument();
  });
});
