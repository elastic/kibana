/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { TableFieldValueCell } from './table_field_value_cell';
import { TestProviders } from '../../../../common/mock';

const contextId = 'test';

const eventId = 'TUWyf3wBFCFU0qRJTauW';

const hostIpData: EventFieldsData = {
  aggregatable: true,
  ariaRowindex: 35,
  field: 'host.ip',
  isObjectArray: false,
  name: 'host.ip',
  originalValue: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
  readFromDocValues: false,
  searchable: true,
  type: 'ip',
  values: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
};
const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', 'fe80::4001:aff:fec8:32'];

describe('TableFieldValueCell', () => {
  describe('common behavior', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <TableFieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    it('should format multiple values such that each value is displayed on a single line', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).className).toContain('column');
    });
  });

  describe('when `BrowserField` metadata is NOT available', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <TableFieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={undefined} // <-- no metadata
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    it('should render each of the expected values when `fieldFromBrowserField` is undefined', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('`message` field formatting', () => {
    const messageData: EventFieldsData = {
      aggregatable: false,
      ariaRowindex: 50,
      field: 'message',
      isObjectArray: false,
      name: 'message',
      originalValue: ['Endpoint network event'],
      readFromDocValues: false,
      searchable: true,
      type: 'string',
      values: ['Endpoint network event'],
    };
    const messageValues = ['Endpoint network event'];

    const messageFieldFromBrowserField: FieldSpec = {
      aggregatable: false,
      name: 'message',
      readFromDocValues: false,
      searchable: true,
      type: 'string',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <TableFieldValueCell
            contextId={contextId}
            data={messageData}
            eventId={eventId}
            fieldFromBrowserField={messageFieldFromBrowserField}
            values={messageValues}
          />
        </TestProviders>
      );
    });

    it('should render special formatting for the `message` field', () => {
      expect(screen.getByTestId('event-field-message')).toBeInTheDocument();
    });

    it('should render the expected message value', () => {
      messageValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('when `FieldSpec` metadata IS available', () => {
    const hostIpFieldFromBrowserField: FieldSpec = {
      aggregatable: true,
      name: 'host.ip',
      readFromDocValues: false,
      searchable: true,
      type: 'ip',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <TableFieldValueCell
            contextId={contextId}
            data={hostIpData}
            eventId={eventId}
            fieldFromBrowserField={hostIpFieldFromBrowserField} // <-- metadata
            values={hostIpValues}
          />
        </TestProviders>
      );
    });

    it('should align items at the start of the group to prevent content from stretching (by default)', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).className).toContain(
        'flexStart'
      );
    });

    it('should render link buttons for each of the host ip addresses', () => {
      expect(screen.getAllByRole('button').length).toBe(hostIpValues.length);
    });

    it('should render each of the expected values when `fieldFromBrowserField` is provided', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });
});
