/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CardWrapper } from '.';

import type { Card } from '../types';
import { SectionId, CardId } from '../types';
import { ALL_DONE_TEXT } from '../translations';
import { fetchRuleManagementFilters } from '../apis';
import { getCardById } from '../sections';
import { useStepContext } from '../context/card_context';

jest.mock('./card_content', () => ({
  CardContent: () => <div data-test-subj="mock-card-content" />,
}));

jest.mock('../context/card_context');
jest.mock('../apis');

jest.mock('../../../../lib/kibana');

jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn().mockReturnValue({ navigateTo: jest.fn() }),
  SecurityPageName: {
    landing: 'landing',
  },
}));

describe('CardStepComponent', () => {
  const onCardClicked = jest.fn();
  const toggleTaskCompleteStatus = jest.fn();

  const props = {
    card: getCardById(CardId.watchTheOverviewVideo) as Card<CardId>,
    toggleTaskCompleteStatus,
    onCardClicked,
    sectionId: SectionId.quickStart,
  };
  const testStepTitle = 'Watch the overview video';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle step expansion on click', () => {
    const { getByText } = render(<CardWrapper {...props} />);

    const cardTitle = getByText(testStepTitle);
    fireEvent.click(cardTitle);

    expect(onCardClicked).toHaveBeenCalledTimes(1);
    expect(onCardClicked).toHaveBeenCalledWith({
      sectionId: SectionId.quickStart,
      cardId: CardId.watchTheOverviewVideo,
      isExpanded: true,
      trigger: 'click',
    });
  });

  it('should render step content when expanded', () => {
    (useStepContext as jest.Mock).mockReturnValue({
      indicesExist: true,
      expandedCardIds: new Set([CardId.watchTheOverviewVideo]),
      finishedCardIds: new Set(),
    });

    const { getByTestId } = render(<CardWrapper {...props} />);

    const content = getByTestId('mock-card-content');

    expect(content).toBeInTheDocument();
  });

  it('should not show the card as completed when it is not', () => {
    (useStepContext as jest.Mock).mockReturnValue({
      indicesExist: true,
      expandedCardIds: new Set(),
      finishedCardIds: new Set(),
    });

    const { queryByText } = render(<CardWrapper {...props} />);

    const text = queryByText(ALL_DONE_TEXT);
    expect(text).not.toBeInTheDocument();
  });

  it('should show the card as completed when it is done', async () => {
    (useStepContext as jest.Mock).mockReturnValue({
      indicesExist: true,
      expandedCardIds: new Set(),
      finishedCardIds: new Set([CardId.enablePrebuiltRules]),
    });

    (fetchRuleManagementFilters as jest.Mock).mockResolvedValue({
      total: 1,
    });
    const mockProps = {
      ...props,
      card: getCardById(CardId.enablePrebuiltRules) as Card<CardId>,
      sectionId: SectionId.getStartedWithAlerts,
    };

    const { queryByText } = render(<CardWrapper {...mockProps} />);

    const text = queryByText(ALL_DONE_TEXT);
    expect(text).toBeInTheDocument();
  });
});
