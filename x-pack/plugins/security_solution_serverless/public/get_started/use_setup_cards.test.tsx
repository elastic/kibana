/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { EuiThemeComputed } from '@elastic/eui';
import { useSetUpSections } from './use_setup_cards';
import type { ActiveSections, CardId, ExpandedCardSteps, StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';
import { ProductLine } from '../../common/product';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
} as EuiThemeComputed;
const finishedSteps = {
  [GetSetUpCardId.introduction]: new Set<StepId>([IntroductionSteps.getToKnowElasticSecurity]),
} as Record<CardId, Set<StepId>>;
describe('useSetUpSections', () => {
  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();

  it('should return the sections', () => {
    const { result } = renderHook(() => useSetUpSections({ euiTheme: mockEuiTheme }));

    const activeSections = {
      [SectionId.getSetUp]: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          timeInMins: 3,
          stepsLeft: 1,
        },
      },
    } as ActiveSections;

    const sections = result.current.setUpSections({
      activeProducts: new Set([ProductLine.security]),
      activeSections,
      expandedCardSteps: {} as ExpandedCardSteps,
      onCardClicked: jest.fn(),
      onStepClicked,
      onStepButtonClicked,
      finishedSteps,
    });

    expect(sections).toHaveLength(1);
  });

  it('should return no section if no active cards', () => {
    const { result } = renderHook(() => useSetUpSections({ euiTheme: mockEuiTheme }));

    const activeSections = null;

    const sections = result.current.setUpSections({
      activeSections,
      activeProducts: new Set([ProductLine.security]),
      expandedCardSteps: {} as ExpandedCardSteps,
      onCardClicked: jest.fn(),
      onStepClicked,
      onStepButtonClicked,
      finishedSteps,
    });

    expect(sections.length).toEqual(0);
  });
});
