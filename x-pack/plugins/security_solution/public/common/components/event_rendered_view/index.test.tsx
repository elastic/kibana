/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { EventRenderedViewProps } from '.';
import { EventRenderedView } from '.';
import { RowRendererId, TableId } from '../../../../common/types';
import { mockTimelineData, TestProviders } from '../../mock';

const eventRenderedProps: EventRenderedViewProps = {
  events: mockTimelineData,
  leadingControlColumns: [],
  onChangePage: () => null,
  onChangeItemsPerPage: () => null,
  pagination: {
    pageIndex: 0,
    pageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    totalItemCount: 100,
  },
  rowRenderers: [],
  scopeId: TableId.alertsOnAlertsPage,
  unitCountText: '10 events',
};

describe('event_rendered_view', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it renders the timestamp correctly', () => {
    render(
      <TestProviders>
        <EventRenderedView {...eventRenderedProps} />
      </TestProviders>
    );
    expect(screen.queryAllByTestId('moment-date')[0].textContent).toEqual(
      'Nov 5, 2018 @ 19:03:25.937'
    );
  });

  describe('getRowRenderer', () => {
    const props = {
      ...eventRenderedProps,
      rowRenderers: [
        {
          id: RowRendererId.auditd_file,
          isInstance: jest.fn().mockReturnValue(false),
          renderRow: jest.fn(),
        },
        {
          id: RowRendererId.netflow,
          isInstance: jest.fn().mockReturnValue(true), // matches any data
          renderRow: jest.fn(),
        },
        {
          id: RowRendererId.registry,
          isInstance: jest.fn().mockReturnValue(true), // also matches any data
          renderRow: jest.fn(),
        },
      ],
    };

    test(`it (only) renders the first matching renderer when 'getRowRenderer' is NOT provided as a prop`, () => {
      render(
        <TestProviders>
          <EventRenderedView {...props} />
        </TestProviders>
      );

      expect(props.rowRenderers[0].renderRow).not.toBeCalled(); // did not match
      expect(props.rowRenderers[1].renderRow).toBeCalled(); // the first matching renderer
      expect(props.rowRenderers[2].renderRow).not.toBeCalled(); // also matches, but should not be rendered
    });

    test(`it (only) renders the renderer returned by 'getRowRenderer' when it's provided as a prop`, () => {
      const withGetRowRenderer = {
        ...props,
        getRowRenderer: jest.fn().mockImplementation(() => props.rowRenderers[2]), // only match the last renderer
      };

      render(
        <TestProviders>
          <EventRenderedView {...withGetRowRenderer} />
        </TestProviders>
      );

      expect(props.rowRenderers[0].renderRow).not.toBeCalled();
      expect(props.rowRenderers[1].renderRow).not.toBeCalled();
      expect(props.rowRenderers[2].renderRow).toBeCalled();
    });

    test(`it does NOT render the plain text version of the reason when a renderer is found`, () => {
      render(
        <TestProviders>
          <EventRenderedView {...props} />
        </TestProviders>
      );

      expect(screen.queryByTestId('plain-text-reason')).not.toBeInTheDocument();
    });

    test(`it renders the plain text reason when no row renderer was found, but the data contains an 'ecs.signal.reason'`, () => {
      const reason = 'why not?';
      const noRendererFound = {
        ...props,
        events: [
          ...props.events,
          {
            _id: 'abcd',
            data: [{ field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] }],
            ecs: {
              _id: 'abcd',
              timestamp: '2018-11-05T19:03:25.937Z',
              signal: {
                reason,
              },
            },
          },
        ],
        getRowRenderer: jest.fn().mockImplementation(() => null), // no renderer was found
      };

      render(
        <TestProviders>
          <EventRenderedView {...noRendererFound} />
        </TestProviders>
      );

      expect(screen.getAllByTestId('plain-text-reason')[0]).toHaveTextContent('why not?');
    });

    test(`it renders the plain text reason when no row renderer was found, but the data contains an 'ecs.kibana.alert.reason'`, () => {
      const reason = 'do you really need a reason?';
      const noRendererFound = {
        ...props,
        events: [
          ...props.events,
          {
            _id: 'abcd',
            data: [],
            ecs: {
              _id: 'abcd',
              timestamp: '2018-11-05T19:03:25.937Z',
              kibana: {
                alert: {
                  reason,
                },
              },
            },
          },
        ],
        getRowRenderer: jest.fn().mockImplementation(() => null), // no renderer was found
      };

      render(
        <TestProviders>
          <EventRenderedView {...noRendererFound} />
        </TestProviders>
      );

      expect(screen.getAllByTestId('plain-text-reason')[0]).toHaveTextContent(
        'do you really need a reason?'
      );
    });
  });
});
