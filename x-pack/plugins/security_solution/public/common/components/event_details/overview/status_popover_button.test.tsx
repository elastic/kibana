/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { StatusPopoverButton } from './status_popover_button';
import { TestProviders } from '../../../mock';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
const props = {
  eventId: 'testid',
  contextId: 'alerts-page',
  enrichedFieldInfo: {
    contextId: 'alerts-page',
    eventId: 'testid',
    fieldType: 'string',
    scopeId: 'alerts-page',
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
      format: { id: 'string' },
      shortDotsEnable: false,
      isMapped: true,
      indexes: ['apm-*-transaction*'],
      description: '',
      example: '',
      fields: {},
    },
  },
  scopeId: 'alerts-page',
  handleOnEventClosed: jest.fn(),
};

type AlertsPriveleges = Partial<ReturnType<typeof useAlertsPrivileges>>;

const writePriveleges: AlertsPriveleges = { hasIndexWrite: true, hasKibanaCRUD: true };
const readPriveleges: AlertsPriveleges = {
  hasIndexWrite: false,
  hasKibanaCRUD: false,
  hasKibanaREAD: true,
  hasIndexRead: true,
};

jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

describe('StatusPopoverButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('it renders the correct status', () => {
    (useAlertsPrivileges as jest.Mock<AlertsPriveleges>).mockReturnValue(writePriveleges);

    const { getByText } = render(
      <TestProviders>
        <StatusPopoverButton {...props} />
      </TestProviders>
    );

    getByText('open');
  });

  test('it shows the correct options when clicked', async () => {
    (useAlertsPrivileges as jest.Mock<AlertsPriveleges>).mockReturnValue(writePriveleges);
    const { getByText, container } = render(
      <TestProviders>
        <StatusPopoverButton {...props} />
      </TestProviders>
    );

    getByText('open').click();
    await waitForEuiPopoverOpen();

    expect(container.querySelector('.euiBadge__icon')).not.toBeNull();
    getByText('Mark as acknowledged');
    getByText('Mark as closed');
  });

  test('Status should be text when user does not have write priveleges', () => {
    (useAlertsPrivileges as jest.Mock<AlertsPriveleges>).mockReturnValue(readPriveleges);
    const { getByText, queryByRole, container } = render(
      <TestProviders>
        <StatusPopoverButton {...props} />
      </TestProviders>
    );

    getByText('open').click();

    // Check the popover downward arrow should not be visible
    expect(container.querySelector('.euiBadge__icon')).toBeNull();

    // popover should not open when hence checking that popover is not open
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
