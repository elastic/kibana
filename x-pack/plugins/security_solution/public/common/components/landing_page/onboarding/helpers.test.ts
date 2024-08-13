/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupActiveSections } from './helpers';
import type { Section } from './types';

import { SectionId, CardId } from './types';

import * as sectionsConfigs from './sections';
const mockSections = jest.spyOn(sectionsConfigs, 'getSections');

const onboardingSteps = [
  CardId.createFirstProject,
  CardId.watchTheOverviewVideo,
  CardId.addIntegrations,
  CardId.viewDashboards,
  CardId.enablePrebuiltRules,
  CardId.viewAlerts,
];

describe('setupActiveSections', () => {
  it('should set up active sections', () => {
    const activeSections = setupActiveSections(onboardingSteps);

    expect(activeSections?.[SectionId.quickStart]).toEqual([
      CardId.createFirstProject,
      CardId.watchTheOverviewVideo,
    ]);
  });

  it('should handle null or empty cards in sections', () => {
    mockSections.mockImplementation(() => [
      {
        id: SectionId.quickStart,
      } as unknown as Section,
    ]);
    const mockOnboardingSteps: CardId[] = [];

    const activeSections = setupActiveSections(mockOnboardingSteps);

    expect(activeSections).toEqual({});

    mockSections.mockRestore();
  });
});
