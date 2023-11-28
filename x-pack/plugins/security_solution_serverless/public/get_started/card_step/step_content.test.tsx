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
  const updateStepStatus = jest.fn();
  const description = ['Description Line 1', 'Description Line 2'];
  const splitPanel = <div>{'Split Panel Content'}</div>;

  it('renders nothing when hasStepContent is false', () => {
    const { container } = render(
      <StepContent
        hasStepContent={false}
        isExpandedStep={true}
        stepId="test-step"
        updateStepStatus={updateStepStatus}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders step content when hasStepContent is true and isExpandedStep is true', () => {
    const { getByTestId, getByText } = render(
      <StepContent
        description={description}
        hasStepContent={true}
        isExpandedStep={true}
        splitPanel={splitPanel}
        stepId="test-step"
        updateStepStatus={updateStepStatus}
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
      <StepContent
        description={description}
        hasStepContent={true}
        isExpandedStep={false}
        stepId="test-step"
        updateStepStatus={updateStepStatus}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
