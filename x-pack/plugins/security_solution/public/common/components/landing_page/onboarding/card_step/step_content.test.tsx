/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { StepContent } from './step_content';
import { QuickStartSectionCardsId, SectionId } from '../types';
import { overviewVideoSteps } from '../sections';

jest.mock('../context/step_context');
jest.mock('../../../../lib/kibana');

describe('StepContent', () => {
  const toggleTaskCompleteStatus = jest.fn();

  const props = {
    cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
    indicesExist: false,
    sectionId: SectionId.quickStart,
    step: overviewVideoSteps[0],
    toggleTaskCompleteStatus,
  };

  it('renders step content when hasStepContent is true and isExpandedStep is true', () => {
    const mockProps = { ...props, hasStepContent: true, isExpandedStep: true };
    const { getByTestId, getByText } = render(<StepContent {...mockProps} />);

    const splitPanelElement = getByTestId('split-panel');

    expect(
      getByText(
        'Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.'
      )
    ).toBeInTheDocument();
    expect(
      getByText('To explore the platform’s core features, watch the video:')
    ).toBeInTheDocument();

    expect(splitPanelElement).toBeInTheDocument();
  });
});
