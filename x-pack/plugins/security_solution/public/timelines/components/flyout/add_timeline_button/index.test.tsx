/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { AddTimelineButton } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import {
  mockIndexPattern,
  mockOpenTimelineQueryResults,
  TestProviders,
} from '../../../../common/mock';
import { getAllTimeline, useGetAllTimeline } from '../../../containers/all';
import { mockHistory, Router } from '../../../../common/mock/router';
import * as i18n from '../../timeline/properties/translations';

jest.mock('../../open_timeline/use_timeline_status', () => {
  const originalModule = jest.requireActual('../../open_timeline/use_timeline_status');
  return {
    ...originalModule,
    useTimelineStatus: jest.fn().mockReturnValue({
      timelineStatus: 'active',
      templateTimelineFilter: [],
      installPrepackagedTimelines: jest.fn(),
    }),
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn(),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../containers/all', () => {
  const originalModule = jest.requireActual('../../../containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});

jest.mock('../../timeline/properties/new_template_timeline', () => ({
  NewTemplateTimeline: jest.fn(() => <div>{'Create new timeline template'}</div>),
}));

jest.mock('../../timeline/properties/helpers', () => ({
  NewTimeline: jest.fn().mockReturnValue(<div>{'Create new timeline'}</div>),
}));

jest.mock('../../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

describe('AddTimelineButton', () => {
  const props = {
    timelineId: TimelineId.active,
  };

  describe('with crud', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });
      render(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders the add new timeline btn', () => {
      expect(screen.getByLabelText(i18n.ADD_TIMELINE)).toBeInTheDocument();
    });

    test('it renders create timeline btn', async () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByText(i18n.NEW_TIMELINE)).toBeInTheDocument();
    });

    test('it renders create timeline template btn', () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByText(i18n.NEW_TEMPLATE_TIMELINE)).toBeInTheDocument();
    });

    test('it renders Open timeline btn', () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByTestId('open-timeline-button')).toBeInTheDocument();
    });
  });

  describe('with no crud', () => {
    beforeEach(async () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: false,
              },
            },
          },
        },
      });
      render(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders the add new timeline btn', () => {
      expect(screen.getByLabelText(i18n.ADD_TIMELINE)).toBeInTheDocument();
    });

    test('it renders create timeline btn', () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByText(i18n.NEW_TIMELINE)).toBeInTheDocument();
    });

    test('it renders create timeline template btn', () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByText(i18n.NEW_TEMPLATE_TIMELINE)).toBeInTheDocument();
    });

    test('it renders Open timeline btn', async () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      expect(screen.getByTestId('open-timeline-button')).toBeInTheDocument();
    });
  });

  describe('open modal', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            getUrlForApp: jest.fn(),
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });

      (useGetAllTimeline as unknown as jest.Mock).mockReturnValue({
        fetchAllTimeline: jest.fn(),
        timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
        loading: false,
        totalCount: mockOpenTimelineQueryResults.totalCount,
        refetch: jest.fn(),
      });

      render(
        <TestProviders>
          <Router history={mockHistory}>
            <AddTimelineButton {...props} />
          </Router>
        </TestProviders>
      );
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    it('should render timelines table', async () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('open-timeline-button')).toBeVisible();

      userEvent.click(screen.getByTestId('open-timeline-button'));
      expect(screen.getByTestId('timelines-table')).toBeInTheDocument();
    });

    it('should render correct actions', async () => {
      userEvent.click(screen.getByLabelText(i18n.ADD_TIMELINE));
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('open-timeline-button')).toBeVisible();

      userEvent.click(screen.getByTestId('open-timeline-button'));

      screen.queryAllByTestId('open-duplicate').forEach((element) => {
        expect(element).toBeInTheDocument();
      });
      expect(screen.queryByTestId('create-from-template')).not.toBeInTheDocument();
    });
  });
});
