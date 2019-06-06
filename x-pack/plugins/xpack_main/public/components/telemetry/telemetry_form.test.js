/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { TelemetryForm } from './telemetry_form';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';

const buildTelemetryOptInProvider = () => {
  const mockHttp = {
    post: jest.fn()
  };

  function mockNotifier() {
    this.notify = jest.fn();
  }

  const mockInjector = {
    get: (key) => {
      switch (key) {
        case '$http':
          return mockHttp;
        case 'Notifier':
          return mockNotifier;
        default:
          return null;
      }
    }
  };

  const chrome = {
    addBasePath: (url) => url
  };

  return new TelemetryOptInProvider(mockInjector, chrome);
};

describe('TelemetryForm', () => {
  it('renders as expected', () => {
    expect(shallowWithIntl(
      <TelemetryForm
        spacesEnabled={false}
        query={{ text: '' }}
        onQueryMatchChange={jest.fn()}
        telemetryOptInProvider={buildTelemetryOptInProvider()}
        enableSaving={true}
      />)
    ).toMatchSnapshot();
  });
});
