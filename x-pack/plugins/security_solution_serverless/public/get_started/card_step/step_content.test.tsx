/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { StepContent } from './step_content';
import { OverviewSteps, QuickStartSectionCardsId, SectionId } from '../types';

describe('StepContent', () => {
  const toggleTaskCompleteStatus = jest.fn();
  const description = ['Description Line 1', 'Description Line 2'];
  const splitPanel = <div>{'Split Panel Content'}</div>;
  const props = {
    cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
    description,
    hasStepContent: false,
    isExpandedStep: true,
    indicesExist: false,
    sectionId: SectionId.quickStart,
    splitPanel,
    stepId: OverviewSteps.getToKnowElasticSecurity,
    toggleTaskCompleteStatus,
  };

  it('renders nothing when hasStepContent is false', () => {
    const { container } = render(<StepContent {...props} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders step content when hasStepContent is true and isExpandedStep is true', () => {
    const mockProps = { ...props, hasStepContent: true, isExpandedStep: true };
    const { getByTestId, getByText } = render(<StepContent {...mockProps} />);

    const splitPanelElement = getByTestId('split-panel');

    expect(getByText('Description Line 1')).toBeInTheDocument();
    expect(getByText('Description Line 2')).toBeInTheDocument();

    expect(splitPanelElement).toBeInTheDocument();
    expect(splitPanelElement).toHaveTextContent('Split Panel Content');
  });

  it('renders nothing when hasStepContent is true but isExpandedStep is false', () => {
    const mockProps = { ...props, hasStepContent: true, isExpandedStep: false };
    const { container } = render(<StepContent {...mockProps} />);

    expect(container.firstChild).toBeNull();
  });
});
