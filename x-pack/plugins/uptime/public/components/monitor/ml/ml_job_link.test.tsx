/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderTLWithRouter } from '../../../lib';
import { MLJobLink } from './ml_job_link';

describe('ML JobLink', () => {
  it('renders without errors', () => {
    const { asFragment } = renderTLWithRouter(
      <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor" />,
      {
        customCoreOptions: { triggersActionsUi: { getEditAlertFlyout: jest.fn() } },
      }
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
