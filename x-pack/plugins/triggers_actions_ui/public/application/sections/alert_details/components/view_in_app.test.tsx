/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { Alert } from '../../../../types';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ViewInApp } from './view_in_app';

jest.mock('../../../app_context', () => ({
  useAppDependencies: jest.fn(() => ({
    http: { getNavigation: jest.fn() },
    alerting: jest.fn(),
    legacy: {
      capabilities: {
        get: jest.fn(() => ({})),
      },
    },
  })),
}));

jest.mock('../../../lib/capabilities', () => ({
  hasSaveAlertsCapability: jest.fn(() => true),
}));

// const AlertDetails = withBulkAlertOperations(RawAlertDetails);
describe('alert_details', () => {
  describe('links', () => {
    it('links to the app that created the alert', () => {
      const alert = mockAlert();

      expect(
        shallow(<ViewInApp alert={alert} />).containsMatchingElement(
          <EuiButtonEmpty disabled={true} iconType="popout">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertDetails.viewAlertInAppButtonLabel"
              defaultMessage="View in app"
            />
          </EuiButtonEmpty>
        )
      ).toBeTruthy();
    });
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    muteAll: false,
    mutedInstanceIds: [],
    ...overloads,
  };
}
