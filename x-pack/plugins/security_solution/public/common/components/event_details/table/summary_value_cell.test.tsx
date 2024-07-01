/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import type { BrowserField } from '../../../containers/source';
import { SummaryValueCell } from './summary_value_cell';
import { TestProviders } from '../../../mock';
import type { EventFieldsData } from '../types';
import type { AlertSummaryRow } from '../helpers';
import { TimelineId } from '../../../../../common/types';
import { AGENT_STATUS_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';

jest.mock('../../../lib/kibana');

jest.mock('../../../hooks/use_get_field_spec');

const eventId = 'TUWyf3wBFCFU0qRJTauW';
const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'];
const hostIpFieldFromBrowserField: BrowserField = {
  aggregatable: true,
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

const enrichedAgentStatusData: AlertSummaryRow['description'] = {
  data: {
    field: AGENT_STATUS_FIELD_NAME,
    format: '',
    type: '',
    aggregatable: false,
    fields: {},
    indexes: [],
    name: AGENT_STATUS_FIELD_NAME,
    searchable: false,
    readFromDocValues: false,
    isObjectArray: false,
  },
  eventId,
  values: [],
  scopeId: TimelineId.test,
};

describe('SummaryValueCell', () => {
  test('it should render', async () => {
    await act(async () => {
      render(
        <TestProviders>
          <SummaryValueCell {...enrichedHostIpData} />
        </TestProviders>
      );
    });

    hostIpValues.forEach((ipValue) => expect(screen.getByText(ipValue)).toBeInTheDocument());
    expect(screen.getByTestId('inlineActions')).toBeInTheDocument();
  });

  describe('Without hover actions', () => {
    test('When in the timeline flyout with timelineId active', async () => {
      await act(async () => {
        render(
          <TestProviders>
            <SummaryValueCell {...enrichedHostIpData} scopeId={TimelineId.active} />
          </TestProviders>
        );
      });

      hostIpValues.forEach((ipValue) => expect(screen.getByText(ipValue)).toBeInTheDocument());
      expect(screen.queryByTestId('inlineActions')).not.toBeInTheDocument();
    });

    test('When rendering the host status field', async () => {
      await act(async () => {
        render(
          <TestProviders>
            <SummaryValueCell {...enrichedAgentStatusData} />
          </TestProviders>
        );
      });

      expect(screen.getByTestId('event-field-agent.status')).toBeInTheDocument();
      expect(screen.queryByTestId('inlineActions')).not.toBeInTheDocument();
    });
  });
});
