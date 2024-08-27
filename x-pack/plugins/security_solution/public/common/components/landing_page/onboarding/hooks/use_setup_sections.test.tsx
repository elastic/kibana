/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useSetUpSections } from './use_setup_sections';
import type { ActiveSections, CardId, ExpandedCardSteps, StepId } from '../types';
import { CreateProjectSteps, QuickStartSectionCardsId, SectionId } from '../types';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
  colors: {},
  font: { weight: { bold: 700 } },
} as EuiThemeComputed;
const finishedSteps = {
  [QuickStartSectionCardsId.createFirstProject]: new Set<StepId>([
    CreateProjectSteps.createFirstProject,
  ]),
} as Record<CardId, Set<StepId>>;
describe('useSetUpSections', () => {
  const onStepClicked = jest.fn();
  const toggleTaskCompleteStatus = jest.fn();

  it('should return the sections', () => {
    const { result } = renderHook(() => useSetUpSections({ euiTheme: mockEuiTheme }));

    const activeSections = {
      [SectionId.quickStart]: {
        [QuickStartSectionCardsId.createFirstProject]: {
          id: QuickStartSectionCardsId.createFirstProject,
          timeInMins: 3,
          stepsLeft: 1,
        },
      },
    } as ActiveSections;

    const sections = result.current.setUpSections({
      activeSections,
      expandedCardSteps: {} as ExpandedCardSteps,
      onStepClicked,
      toggleTaskCompleteStatus,
      finishedSteps,
    });

    expect(sections).toHaveLength(1);
  });

  it('should return no section if no active cards', () => {
    const { result } = renderHook(() => useSetUpSections({ euiTheme: mockEuiTheme }));

    const activeSections = null;

    const sections = result.current.setUpSections({
      activeSections,
      expandedCardSteps: {} as ExpandedCardSteps,
      onStepClicked,
      toggleTaskCompleteStatus,
      finishedSteps,
    });

    expect(sections.length).toEqual(0);
  });
});
