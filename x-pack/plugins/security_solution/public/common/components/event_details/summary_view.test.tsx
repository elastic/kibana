/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { BrowserField } from '../../containers/source';
import { TestProviders } from '../../mock';
import type { EventFieldsData } from './types';
import { SummaryView } from './summary_view';
import { TimelineId } from '../../../../common/types';
import type { AlertSummaryRow } from './helpers';

jest.mock('../../lib/kibana');

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
  scopeId: TimelineId.test,
  values: [...hostIpValues],
};

const mockCount = 90019001;
jest.mock('../../containers/alerts/use_alert_prevalence', () => ({
  useAlertPrevalence: () => ({
    loading: false,
    count: mockCount,
    error: false,
  }),
}));

describe('Summary View', () => {
  describe('when no data is provided', () => {
    test('should show an empty table', () => {
      render(
        <TestProviders>
          <SummaryView goToTable={jest.fn()} title="Test Summary View" rows={[]} />
        </TestProviders>
      );
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });
  });

  describe('when data is provided', () => {
    test('should show the data', () => {
      const sampleRows: AlertSummaryRow[] = [
        {
          title: hostIpData.field,
          description: enrichedHostIpData,
        },
      ];

      render(
        <TestProviders>
          <SummaryView goToTable={jest.fn()} title="Test Summary View" rows={sampleRows} />
        </TestProviders>
      );
      // Shows the field name
      expect(screen.getByText(hostIpData.field)).toBeInTheDocument();
      // Shows all the field values
      hostIpValues.forEach((ipValue) => {
        expect(screen.getByText(ipValue)).toBeInTheDocument();
      });

      // Shows alert prevalence information
      expect(screen.getByText(mockCount)).toBeInTheDocument();
      // Shows the Investigate in timeline button
      expect(screen.getByLabelText('Investigate in timeline')).toBeInTheDocument();
    });
  });

  describe('when in readOnly mode', () => {
    test('should only show the name and value cell', () => {
      const sampleRows: AlertSummaryRow[] = [
        {
          title: hostIpData.field,
          description: enrichedHostIpData,
        },
      ];

      render(
        <TestProviders>
          <SummaryView
            goToTable={jest.fn()}
            title="Test Summary View"
            rows={sampleRows}
            isReadOnly={true}
          />
        </TestProviders>
      );

      // Does not render the prevalence and timeline items
      expect(screen.queryByText(mockCount)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Investigate in timeline')).not.toBeInTheDocument();
    });
  });
});
