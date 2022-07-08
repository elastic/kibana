/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { BrowserField } from '../../../containers/source';
import { PrevalenceCellRenderer } from './prevalence_cell';
import { TestProviders } from '../../../mock';
import type { EventFieldsData } from '../types';
import { TimelineId } from '../../../../../common/types';
import type { AlertSummaryRow } from '../helpers';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';
import { useAlertPrevalenceFromProcessTree } from '../../../containers/alerts/use_alert_prevalence_from_process_tree';
import { getEmptyValue } from '../../empty_value';

jest.mock('../../../lib/kibana');
jest.mock('../../../containers/alerts/use_alert_prevalence', () => ({
  useAlertPrevalence: jest.fn(),
}));
const mockUseAlertPrevalence = useAlertPrevalence as jest.Mock;

jest.mock('../../../containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

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

const processEntityValues = ['d8787283h827h3'];
const processEntityFieldFromBrowserField: BrowserField = {
  aggregatable: true,
  category: 'process',
  description: 'Process entity ID.',
  example: '3847h384',
  fields: {},
  format: '',
  indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  name: 'process.entity_id',
  readFromDocValues: false,
  searchable: true,
  type: 'string',
};
const processEntityData: EventFieldsData = {
  ...processEntityFieldFromBrowserField,
  ariaRowindex: 35,
  field: 'process.entity_id',
  fields: {},
  format: '',
  isObjectArray: false,
  originalValue: [...processEntityValues],
  values: [...processEntityValues],
};

const enrichedProcessEntityData: AlertSummaryRow['description'] = {
  data: { ...processEntityData },
  eventId,
  fieldFromBrowserField: { ...processEntityFieldFromBrowserField },
  isDraggable: false,
  timelineId: TimelineId.test,
  values: [...processEntityValues],
};

describe('PrevalenceCellRenderer', () => {
  describe('From Query', () => {
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

  describe('From Process Tree', () => {
    describe('When data is loading', () => {
      test('it should show the loading spinner', async () => {
        mockUseAlertPrevalenceFromProcessTree.mockImplementation(() => ({
          loading: true,
          error: true,
        }));
        const { container } = render(
          <TestProviders>
            <PrevalenceCellRenderer {...enrichedProcessEntityData} />
          </TestProviders>
        );
        expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(1);
      });
    });

    describe('When an error was returned', () => {
      test('it should return empty value placeholder', async () => {
        mockUseAlertPrevalenceFromProcessTree.mockImplementation(() => ({
          loading: false,
          error: true,
        }));
        const { container } = render(
          <TestProviders>
            <PrevalenceCellRenderer {...enrichedProcessEntityData} />
          </TestProviders>
        );
        expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(0);
        expect(screen.queryByText('123')).toBeNull();
        expect(screen.queryByText(getEmptyValue())).toBeTruthy();
      });
    });

    describe('When an actual count is returned', () => {
      test('it should show the count', async () => {
        mockUseAlertPrevalenceFromProcessTree.mockImplementation(() => ({
          loading: false,
          alertIds: ['87f4dc72-3dd6-4cc3-bcd3-6faf42a21667', '2039j20-3dd6-4cc3-bcd3-6faf42a21667'],
          error: false,
        }));
        const { container } = render(
          <TestProviders>
            <PrevalenceCellRenderer {...enrichedProcessEntityData} />
          </TestProviders>
        );
        expect(container.getElementsByClassName('euiLoadingSpinner')).toHaveLength(0);
        expect(screen.queryByText('2')).toBeInTheDocument();
      });
    });
  });
});
