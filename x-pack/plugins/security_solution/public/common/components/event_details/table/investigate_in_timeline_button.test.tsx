/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BrowserField } from '../../../containers/source';
import { InvestigateInTimelineButton } from './investigate_in_timeline_button';
import { TestProviders } from '../../../mock';
import { EventFieldsData } from '../types';
import { TimelineId } from '../../../../../common/types';

import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

jest.mock('../../../lib/kibana');

const eventId = 'TUWyf3wBFCFU0qRJTauW';

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
  originalValue: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
  values: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
};

describe('InvestigateInTimelineButton', () => {
  describe('When all props are provided', () => {
    test('it should display the add to timeline button', () => {
      render(
        <TestProviders>
          <InvestigateInTimelineButton
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={hostIpFieldFromBrowserField}
            linkValue={undefined}
            timelineId={TimelineId.test}
            values={hostIpData.values}
          />
        </TestProviders>
      );
      expect(screen.queryByLabelText(ACTION_INVESTIGATE_IN_TIMELINE)).toBeInTheDocument();
    });
  });

  describe('When browser field data necessary for timeline is unavailable', () => {
    test('it should not render', () => {
      render(
        <TestProviders>
          <InvestigateInTimelineButton
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={undefined}
            linkValue={undefined}
            timelineId={TimelineId.test}
            values={hostIpData.values}
          />
        </TestProviders>
      );
      expect(screen.queryByLabelText(ACTION_INVESTIGATE_IN_TIMELINE)).not.toBeInTheDocument();
    });
  });
});
