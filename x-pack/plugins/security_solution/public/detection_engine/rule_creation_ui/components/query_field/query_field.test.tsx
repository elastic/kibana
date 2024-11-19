/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryField } from '.';
import {
  TestProviders,
  useFormFieldMock,
  mockOpenTimelineQueryResults,
} from '../../../../common/mock';
import { useGetAllTimeline, getAllTimeline } from '../../../../timelines/containers/all';
import { mockHistory, Router } from '../../../../common/mock/router';
import { render, act, fireEvent } from '@testing-library/react';
import { resolveTimeline } from '../../../../timelines/containers/api';
import { mockTimeline } from '../../../../../server/lib/timeline/__mocks__/create_timelines';
import type { ResolveTimelineResponse } from '../../../../../common/api/timeline';

jest.mock('../../../../timelines/containers/api');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    KibanaServices: {
      get: jest.fn(() => ({
        http: {
          post: jest.fn().mockReturnValue({
            success: true,
            success_count: 0,
            timelines_installed: 0,
            timelines_updated: 0,
            errors: [],
          }),
          fetch: jest.fn(),
        },
      })),
    },
  };
});

jest.mock('../../../../timelines/containers/all', () => {
  const originalModule = jest.requireActual('../../../../timelines/containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});

const resolvedTimeline: ResolveTimelineResponse = {
  timeline: { ...mockTimeline, savedObjectId: '1', version: 'abc' },
  outcome: 'exactMatch',
};

describe('QueryBarDefineRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetAllTimeline as unknown as jest.Mock).mockReturnValue({
      fetchAllTimeline: jest.fn(),
      timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
      loading: false,
      totalCount: mockOpenTimelineQueryResults.totalCount,
      refetch: jest.fn(),
    });
    (resolveTimeline as jest.Mock).mockResolvedValue(resolvedTimeline);
  });

  it('renders correctly', () => {
    const field = useFormFieldMock();

    const { getByTestId } = render(
      <TestProviders>
        <Router history={mockHistory}>
          <QueryField
            isLoading={false}
            indexPattern={{ fields: [], title: 'title' }}
            onCloseTimelineSearch={jest.fn()}
            openTimelineSearch={true}
            dataTestSubj="query-bar-define-rule"
            idAria="idAria"
            field={field}
          />
        </Router>
      </TestProviders>
    );
    expect(getByTestId('query-bar-define-rule')).toBeInTheDocument();
  });

  it('renders import query from saved timeline modal actions hidden correctly', async () => {
    await act(async () => {
      const field = useFormFieldMock();

      const { queryByTestId } = render(
        <TestProviders>
          <Router history={mockHistory}>
            <QueryField
              isLoading={false}
              indexPattern={{ fields: [], title: 'title' }}
              onCloseTimelineSearch={jest.fn()}
              openTimelineSearch={true}
              dataTestSubj="query-bar-define-rule"
              idAria="idAria"
              field={field}
            />
          </Router>
        </TestProviders>
      );

      expect(queryByTestId('open-duplicate')).not.toBeInTheDocument();
      expect(queryByTestId('create-from-template')).not.toBeInTheDocument();
    });
  });

  it('calls onOpenTimeline correctly', async () => {
    const field = useFormFieldMock();
    const onOpenTimeline = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <Router history={mockHistory}>
          <QueryField
            isLoading={false}
            indexPattern={{ fields: [], title: 'title' }}
            onCloseTimelineSearch={jest.fn()}
            openTimelineSearch={true}
            dataTestSubj="query-bar-define-rule"
            idAria="idAria"
            field={field}
            onOpenTimeline={onOpenTimeline}
          />
        </Router>
      </TestProviders>
    );
    getByTestId('open-timeline-modal').click();

    await act(async () => {
      fireEvent.click(getByTestId('timeline-title-10849df0-7b44-11e9-a608-ab3d811609'));
    });
    expect(onOpenTimeline).toHaveBeenCalled();
  });
});
