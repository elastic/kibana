/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { mockTimelineModel, TestProviders } from '../../../common/mock';
import { AddToFavoritesButton } from '.';
import { TimelineStatus } from '../../../../common/api/timeline';

const mockGetState = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSelector: (selector: any) =>
      selector({
        timeline: {
          timelineById: {
            'timeline-1': {
              ...mockGetState(),
            },
          },
        },
      }),
  };
});

const renderAddFavoritesButton = (isPartOfGuidedTour = false) =>
  render(
    <TestProviders>
      <AddToFavoritesButton timelineId="timeline-1" isPartOfGuidedTour={isPartOfGuidedTour} />
    </TestProviders>
  );

describe('AddToFavoritesButton', () => {
  it('should render favorite button enabled and unchecked', () => {
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatus.active,
    });

    const { getByTestId, queryByTestId } = renderAddFavoritesButton();

    const button = getByTestId('timeline-favorite-empty-star');

    expect(button).toBeInTheDocument();
    expect(button).toHaveProperty('id', '');
    expect(button.firstChild).toHaveAttribute('data-euiicon-type', 'starEmpty');
    expect(queryByTestId('timeline-favorite-filled-star')).not.toBeInTheDocument();
  });

  it('should render favorite button disabled for a draft timeline', () => {
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatus.draft,
    });

    const { getByTestId } = renderAddFavoritesButton();

    expect(getByTestId('timeline-favorite-empty-star')).toHaveProperty('disabled');
  });

  it('should render favorite button disabled for an immutable timeline', () => {
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatus.immutable,
    });

    const { getByTestId } = renderAddFavoritesButton();

    expect(getByTestId('timeline-favorite-empty-star')).toHaveProperty('disabled');
  });

  it('should render favorite button filled for a favorite timeline', () => {
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      isFavorite: true,
    });

    const { getByTestId, queryByTestId } = renderAddFavoritesButton();

    expect(getByTestId('timeline-favorite-filled-star')).toBeInTheDocument();
    expect(queryByTestId('timeline-favorite-empty-star')).not.toBeInTheDocument();
  });

  it('should use id for guided tour if prop is true', () => {
    mockGetState.mockReturnValue({
      ...mockTimelineModel,
      status: TimelineStatus.active,
    });

    const { getByTestId } = renderAddFavoritesButton(true);

    const button = getByTestId('timeline-favorite-empty-star');

    expect(button).toHaveProperty('id', 'add-to-favorites');
  });
});
