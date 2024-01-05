/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_INPUTS_TAB_TEST_ID } from '../../../entity_analytics/components/entity_details_flyout';
import { render } from '@testing-library/react';
import React from 'react';
import { HostDetailsPanel } from '.';
import { TestProviders } from '../../../common/mock';

describe('HostDetailsPanel', () => {
  it('render risk inputs panel', () => {
    const { getByTestId } = render(
      <HostDetailsPanel
        riskInputs={{
          alertIds: ['test-id-1', 'test-id-2'],
        }}
      />,
      { wrapper: TestProviders }
    );
    expect(getByTestId(RISK_INPUTS_TAB_TEST_ID)).toBeInTheDocument();
  });

  it("doesn't render risk inputs panel when no alerts ids are provided", () => {
    const { queryByTestId } = render(
      <HostDetailsPanel
        riskInputs={{
          alertIds: [],
        }}
      />,
      { wrapper: TestProviders }
    );
    expect(queryByTestId(RISK_INPUTS_TAB_TEST_ID)).not.toBeInTheDocument();
  });
});
