/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCard, getTotalCardsNumber, getTotalUndoneCardsNumber, hasCardDone } from './helpers';
import { QuickStart, SectionId } from './types';

import { CREATE_FIRST_PROJECT_TITLE } from './translations';

describe('getCard', () => {
  it('get card by card id and section id', () => {
    const card = getCard({ cardId: QuickStart.createFirstProject, sectionId: SectionId.quicStart });

    expect(card).toEqual(
      expect.objectContaining({
        id: QuickStart.createFirstProject,
        title: CREATE_FIRST_PROJECT_TITLE,
        allowUndo: false,
        icon: {
          type: 'addDataApp',
        },
      })
    );
  });
});

describe('getTotalCardsNumber', () => {
  it('adds up card number across sections', () => {
    expect(getTotalCardsNumber()).toEqual(6);
  });
});

describe('getTotalUndoneCardsNumber', () => {
  it('adds up undone card number across sections', () => {
    expect(getTotalUndoneCardsNumber(1)).toEqual(5);
  });
});

describe('hasCardDone', () => {
  it('check if current card has been done', () => {
    expect(
      hasCardDone(QuickStart.createFirstProject, new Set([QuickStart.createFirstProject]))
    ).toBeTruthy();
  });

  it('check if current card has not been done', () => {
    expect(
      hasCardDone(QuickStart.watchTheOverviewVideo, new Set([QuickStart.createFirstProject]))
    ).toBeFalsy();
  });
});
