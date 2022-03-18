/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BrowserField } from '../../../containers/source';
import { SummaryValueCell } from './summary_value_cell';
import { TestProviders } from '../../../mock';
import { EventFieldsData } from '../types';
import { AlertSummaryRow } from '../helpers';
import { TimelineId } from '../../../../../common/types';

jest.mock('../../../lib/kibana');

const eventId = 'TUWyf3wBFCFU0qRJTauW';
const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'];
const hostIpFieldFromBrowserField: BrowserField = {
  aggregatable: true,
  category: 'host',
  description: 'Host ip addresses.',
  example: '127.0.0.1',
  fields: {},
  format: '',
  indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  name: 'host.ip',
  readFromDocValues: false,
  searchable: true,
  type: 'ip',
};
const hostIpData: EventFieldsData = {
  ...hostIpFieldFromBrowserField,
  ariaRowindex: 35,
  field: 'host.ip',
  fields: {},
  format: '',
  isObjectArray: false,
  originalValue: [...hostIpValues],
  values: [...hostIpValues],
};

const enrichedHostIpData: AlertSummaryRow['description'] = {
  data: { ...hostIpData },
  eventId,
  fieldFromBrowserField: { ...hostIpFieldFromBrowserField },
  isDraggable: false,
  timelineId: TimelineId.test,
  values: [...hostIpValues],
};

describe('SummaryValueCell', () => {
  test('it should render', async () => {
    render(
      <TestProviders>
        <SummaryValueCell {...enrichedHostIpData} />
      </TestProviders>
    );
    hostIpValues.forEach((ipValue) => expect(screen.getByText(ipValue)).toBeInTheDocument());
    expect(screen.getAllByTestId('test-filter-for')).toHaveLength(1);
    expect(screen.getAllByTestId('test-filter-out')).toHaveLength(1);
  });

  describe('When in the timeline flyout with timelineId active', () => {
    test('it should not render the default hover actions', async () => {
      render(
        <TestProviders>
          <SummaryValueCell {...enrichedHostIpData} timelineId={TimelineId.active} />
        </TestProviders>
      );
      hostIpValues.forEach((ipValue) => expect(screen.getByText(ipValue)).toBeInTheDocument());
      expect(screen.queryByTestId('test-filter-for')).toBeNull();
      expect(screen.queryByTestId('test-filter-out')).toBeNull();
    });
  });
});
