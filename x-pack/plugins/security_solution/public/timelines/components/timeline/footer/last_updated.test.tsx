/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useEventDetailsWidthContext } from '../../../../common/components/events_viewer/event_details_width_context';
import { FixedWidthLastUpdatedContainer } from './last_updated';
import { useKibana } from '../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../../common/components/events_viewer/event_details_width_context');
jest.mock('../../../../common/lib/kibana');

const mockEventDetailsWidthContainer = jest.fn().mockImplementation(() => {
  return 800;
});

const mockUseLastUpdatedTimelinesPlugin = jest.fn().mockImplementation(() => {
  return `Updated 2 minutes ago`;
});

describe('FixWidthLastUpdateContainer', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: {
          ...createStartServicesMock(),
          timelines: {
            getLastUpdated: mockUseLastUpdatedTimelinesPlugin,
          },
        },
      };
    });

    (useEventDetailsWidthContext as jest.Mock).mockImplementation(mockEventDetailsWidthContainer);
  });

  it('should return normal version when width is greater than 600', () => {
    render(<FixedWidthLastUpdatedContainer updatedAt={Date.now()} />);
    expect(screen.getByTestId('fixed-width-last-updated')).toHaveTextContent(
      'Updated 2 minutes ago'
    );
    expect(screen.getByTestId('fixed-width-last-updated')).toHaveStyle({
      width: '200px',
    });
  });
  it('should return compact version when width is less than 600', () => {
    mockEventDetailsWidthContainer.mockReturnValueOnce(400);
    render(<FixedWidthLastUpdatedContainer updatedAt={Date.now()} />);
    expect(screen.getByTestId('fixed-width-last-updated')).toHaveTextContent(
      'Updated 2 minutes ago'
    );
    expect(screen.getByTestId('fixed-width-last-updated')).toHaveStyle({
      width: '25px',
    });
  });
});
