/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StatusPopoverButton } from './status_popover_button';
import { TestProviders } from '../../../../common/mock';

const props = {
  eventId: 'testid',
  contextId: 'detections-page',
  enrichedFieldInfo: {
    contextId: 'detections-page',
    eventId: 'testid',
    fieldType: 'string',
    timelineId: 'detections-page',
    data: {
      field: 'kibana.alert.workflow_status',
      format: 'string',
      type: 'string',
      isObjectArray: false,
    },
    values: ['open'],
    fieldFromBrowserField: {
      category: 'kibana',
      count: 0,
      name: 'kibana.alert.workflow_status',
      type: 'string',
      esTypes: ['keyword'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      format: 'string',
      shortDotsEnable: false,
      isMapped: true,
      indexes: ['apm-*-transaction*'],
      description: '',
      example: '',
      fields: {},
    },
  },
  indexName: '.internal.alerts-security.alerts-default-000001',
  timelineId: 'detections-page',
  handleOnEventClosed: jest.fn(),
};

jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({
    useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
  })
);

describe('StatusPopoverButton', () => {
  test('it renders the correct status', () => {
    const { getByText } = render(
      <TestProviders>
        <StatusPopoverButton {...props} />
      </TestProviders>
    );

    getByText('open');
  });

  test('it shows the correct options when clicked', () => {
    const { getByText } = render(
      <TestProviders>
        <StatusPopoverButton {...props} />
      </TestProviders>
    );

    getByText('open').click();

    getByText('Mark as acknowledged');
    getByText('Mark as closed');
  });
});
