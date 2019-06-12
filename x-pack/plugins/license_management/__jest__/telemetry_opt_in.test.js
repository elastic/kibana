/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { TelemetryOptIn } from '../public/components/telemetry_opt_in';
import { mountWithIntl } from '../../../test_utils/enzyme_helpers';

jest.mock('ui/capabilities', () => ({
  get: jest.fn(),
}));

describe('TelemetryOptIn', () => {
  test('should display when telemetry not opted in', () => {
    const telemetry = require('../public/lib/telemetry');
    telemetry.showTelemetryOptIn = () => { return true; };
    const rendered = mountWithIntl(<TelemetryOptIn />);
    expect(rendered).toMatchSnapshot();
  });
  test('should not display when telemetry is opted in', () => {
    const telemetry = require('../public/lib/telemetry');
    telemetry.showTelemetryOptIn = () => { return false; };
    const rendered = mountWithIntl(<TelemetryOptIn />);
    expect(rendered).toMatchSnapshot();
  });
});
