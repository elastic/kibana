/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { StepContent } from './step_content';

describe('StepContent', () => {
  it('renders nothing when hasStepContent is false', () => {
    const { container } = render(
      <StepContent hasStepContent={false} isExpandedStep={true} stepId="test-step" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders step content when hasStepContent is true and isExpandedStep is true', () => {
    const description = ['Description Line 1', 'Description Line 2'];
    const splitPanel = <div>{'Split Panel Content'}</div>;
    const { getByTestId, getByText } = render(
      <StepContent
        hasStepContent={true}
        isExpandedStep={true}
        stepId="test-step"
        description={description}
        splitPanel={splitPanel}
      />
    );

    const splitPanelElement = getByTestId('split-panel');

    expect(getByText('Description Line 1')).toBeInTheDocument();
    expect(getByText('Description Line 2')).toBeInTheDocument();

    expect(splitPanelElement).toBeInTheDocument();
    expect(splitPanelElement).toHaveTextContent('Split Panel Content');
  });

  it('renders nothing when hasStepContent is true but isExpandedStep is false', () => {
    const { container } = render(
      <StepContent hasStepContent={true} isExpandedStep={false} stepId="test-step" />
    );

    expect(container.firstChild).toBeNull();
  });
});
