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
import { TableId } from '../../../../common/types';
import { mockTimelineData, TestProviders } from '../../mock';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        triggersActionsUi: {
          getFieldBrowser: jest.fn(),
        },
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
        },
      },
    }),
  };
});

const getRowRendererMock = jest.fn();
jest.mock('../../../timelines/components/fields_browser', () => ({
  getRowRenderer: getRowRendererMock,
}));

const eventRenderedProps: EventRenderedViewProps = {
  alertToolbar: <></>,
  events: mockTimelineData,
  leadingControlColumns: [],
  onChangePage: () => null,
  onChangeItemsPerPage: () => null,
  pageIndex: 0,
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  rowRenderers: [],
  scopeId: TableId.alertsOnAlertsPage,
  totalItemCount: 100,
};

describe('event_rendered_view', () => {
  test('it renders the timestamp correctly', () => {
    render(
      <TestProviders>
        <EventRenderedView {...eventRenderedProps} />
      </TestProviders>
    );
    expect(screen.queryAllByTestId('moment-date')[0].textContent).toEqual(
      '2018-11-05T14:03:25-05:00'
    );
  });
});
