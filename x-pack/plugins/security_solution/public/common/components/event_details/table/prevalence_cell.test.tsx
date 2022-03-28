/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BrowserField } from '../../../containers/source';
import { PrevalenceCellRenderer } from './prevalence_cell';
import { TestProviders } from '../../../mock';
import { EventFieldsData } from '../types';
import { TimelineId } from '../../../../../common/types';
import { AlertSummaryRow } from '../helpers';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { getEmptyValue } from '../../../components/empty_value';

jest.mock('../../../lib/kibana');
jest.mock('../../../containers/alerts/use_alert_prevalence', () => ({
  useAlertPrevalence: jest.fn(),
}));
const mockUseAlertPrevalence = useAlertPrevalence as jest.Mock;

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

describe('PrevalenceCellRenderer', () => {
  describe('When data is loading', () => {
    test('it should show the loading spinner', async () => {
      mockUseAlertPrevalence.mockImplementation(() => ({
        loading: true,
        count: 123,
        error: true,
      }));
      const { container } = render(
        <TestProviders>
          <PrevalenceCellRenderer {...enrichedHostIpData} />
        </TestProviders>
      );
      expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(1);
    });
  });

  describe('When an error was returned', () => {
    test('it should return empty value placeholder', async () => {
      mockUseAlertPrevalence.mockImplementation(() => ({
        loading: false,
        count: undefined,
        error: true,
      }));
      const { container } = render(
        <TestProviders>
          <PrevalenceCellRenderer {...enrichedHostIpData} />
        </TestProviders>
      );
      expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(0);
      expect(screen.queryByText('123')).toBeNull();
      expect(screen.queryByText(getEmptyValue())).toBeTruthy();
    });
  });

  describe('When an actual count is returned', () => {
    test('it should show the count', async () => {
      mockUseAlertPrevalence.mockImplementation(() => ({
        loading: false,
        count: 123,
        error: false,
      }));
      const { container } = render(
        <TestProviders>
          <PrevalenceCellRenderer {...enrichedHostIpData} />
        </TestProviders>
      );
      expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(0);
      expect(screen.queryByText('123')).toBeInTheDocument();
    });
  });
});
