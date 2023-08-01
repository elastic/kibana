/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { EuiThemeComputed } from '@elastic/eui';
import { useSetUpCardSections } from './use_setup_cards';
import type { ActiveCards, CardId, StepId } from './types';
import {
  GetMoreFromElasticSecurityCardId,
  GetSetUpCardId,
  IntroductionSteps,
  SectionId,
} from './types';

const mockEuiTheme: EuiThemeComputed = {
  size: {
    l: '16px',
    base: '20px',
  },
} as EuiThemeComputed;
const finishedSteps = {
  [GetSetUpCardId.introduction]: new Set<StepId>([IntroductionSteps.watchOverviewVideo]),
} as Record<CardId, Set<StepId>>;
describe('useSetUpCardSections', () => {
  it('should return the sections', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeCards = {
      [SectionId.getSetUp]: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          timeInMins: 3,
          stepsLeft: 1,
        },
      },
      [SectionId.getMoreFromElasticSecurity]: {
        [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
          id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
        },
      },
    } as ActiveCards;

    const sections = result.current.setUpSections({
      activeCards,
      onStepClicked: jest.fn(),
      finishedSteps,
    });

    expect(sections).toHaveLength(2);
  });

  it('should return no section if no active cards', () => {
    const { result } = renderHook(() => useSetUpCardSections({ euiTheme: mockEuiTheme }));

    const activeCards = null;

    const sections = result.current.setUpSections({
      activeCards,
      onStepClicked: jest.fn(),
      finishedSteps,
    });

    expect(sections.length).toEqual(0);
  });
});
