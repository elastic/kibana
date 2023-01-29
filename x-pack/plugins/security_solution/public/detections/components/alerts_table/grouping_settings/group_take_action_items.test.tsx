/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { useGroupTakeActionsItems } from '.';

describe('useGroupTakeActionsItems', () => {
  it('returns array take actions items available for alerts table if showAlertStatusActions is true', async () => {
    const takeActionItems = render(
      <TestProviders>
        {useGroupTakeActionsItems({
          indexName: '.alerts-security.alerts-default',
          showAlertStatusActions: true,
        })}
      </TestProviders>
    );

    expect(await takeActionItems.findByTestId('open-alert-status')).toBeInTheDocument();
  });

  it('returns  empty array of take actions items available for alerts table if showAlertStatusActions is false', async () => {
    const takeActionItems = render(
      <TestProviders>
        {useGroupTakeActionsItems({
          indexName: '.alerts-security.alerts-default',
          showAlertStatusActions: false,
        })}
      </TestProviders>
    );

    expect(await takeActionItems.findByTestId('open-alert-status')).not.toBeInTheDocument();
  });
});
