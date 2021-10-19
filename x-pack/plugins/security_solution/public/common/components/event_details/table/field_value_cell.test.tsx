/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BrowserField } from '../../../containers/source';
import { FieldValueCell } from './field_value_cell';
import { TestProviders } from '../../../mock';
import { EventFieldsData } from '../types';

const contextId = 'test';

const eventId = 'TUWyf3wBFCFU0qRJTauW';

const hostIpData: EventFieldsData = {
  aggregatable: true,
  ariaRowindex: 35,
  category: 'host',
  description: 'Host ip addresses.',
  example: '127.0.0.1',
  field: 'host.ip',
  fields: {},
  format: '',
  indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  isObjectArray: false,
  name: 'host.ip',
  originalValue: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
  searchable: true,
  type: 'ip',
  values: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
};
const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', 'fe80::4001:aff:fec8:32'];

describe('FieldValueCell', () => {
  describe('common behavior', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <FieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    test('it formats multiple values such that each value is displayed on a single line', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`)).toHaveClass(
        'euiFlexGroup--directionColumn'
      );
    });
  });

  describe('when `BrowserField` metadata is NOT available', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <FieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={undefined} // <-- no metadata
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    test('it renders each of the expected values when `fieldFromBrowserField` is undefined', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });

    test('it renders values formatted as plain text (without `eventFieldsTable__fieldValue` formatting)', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).firstChild).not.toHaveClass(
        'eventFieldsTable__fieldValue'
      );
    });
  });

  describe('`message` field formatting', () => {
    const messageData: EventFieldsData = {
      aggregatable: false,
      ariaRowindex: 50,
      category: 'base',
      description:
        'For log events the message field contains the log message, optimized for viewing in a log viewer. For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event. If multiple messages exist, they can be combined into one message.',
      example: 'Hello World',
      field: 'message',
      fields: {},
      format: '',
      indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
      isObjectArray: false,
      name: 'message',
      originalValue: ['Endpoint network event'],
      searchable: true,
      type: 'string',
      values: ['Endpoint network event'],
    };
    const messageValues = ['Endpoint network event'];

    const messageFieldFromBrowserField: BrowserField = {
      aggregatable: false,
      category: 'base',
      description:
        'For log events the message field contains the log message, optimized for viewing in a log viewer. For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event. If multiple messages exist, they can be combined into one message.',
      example: 'Hello World',
      fields: {},
      format: '',
      indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
      name: 'message',
      searchable: true,
      type: 'string',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <FieldValueCell
            contextId={contextId}
            data={messageData}
            eventId={eventId}
            fieldFromBrowserField={messageFieldFromBrowserField}
            values={messageValues}
          />
        </TestProviders>
      );
    });

    test('it renders special formatting for the `message` field', () => {
      expect(screen.getByTestId('event-field-message')).toBeInTheDocument();
    });

    test('it renders the expected message value', () => {
      messageValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('when `BrowserField` metadata IS available', () => {
    const hostIpFieldFromBrowserField: BrowserField = {
      aggregatable: true,
      category: 'host',
      description: 'Host ip addresses.',
      example: '127.0.0.1',
      fields: {},
      format: '',
      indexes: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
      name: 'host.ip',
      searchable: true,
      type: 'ip',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <FieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={hostIpFieldFromBrowserField} // <-- metadata
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    test('it renders values formatted with the expected class', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).firstChild).toHaveClass(
        'eventFieldsTable__fieldValue'
      );
    });

    test('it renders link buttons for each of the host ip addresses', () => {
      expect(screen.getAllByRole('button').length).toBe(hostIpValues.length);
    });

    test('it renders each of the expected values when `fieldFromBrowserField` is provided', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });
});
