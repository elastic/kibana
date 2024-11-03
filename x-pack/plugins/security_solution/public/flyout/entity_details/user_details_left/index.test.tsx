/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { UserDetailsPanel } from '.';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

describe('LeftPanel', () => {
  it('renders', () => {
    const { queryByText } = render(
      <UserDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
        }}
        isRiskScoreExist
        user={{ name: 'test user', email: [] }}
        scopeId={'scopeId'}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Risk contributions');

    expect(tabElement).toBeInTheDocument();
  });

  it('does not render the tab if tab is not found', () => {
    const { queryByText } = render(
      <UserDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
        }}
        isRiskScoreExist={false}
        user={{ name: 'test user', email: [] }}
        scopeId={'scopeId'}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Risk Inputs');

    expect(tabElement).not.toBeInTheDocument();
  });

  it("doesn't render insights panel when there no misconfiguration findings", () => {
    const { queryByText } = render(
      <UserDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
        }}
        isRiskScoreExist
        user={{ name: 'test user', email: [] }}
        scopeId={'scopeId'}
        hasMisconfigurationFindings={false}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Insights');

    expect(tabElement).not.toBeInTheDocument();
  });

  it('render insights panel when there are misconfiguration findings', () => {
    const { queryByText } = render(
      <UserDetailsPanel
        path={{
          tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
        }}
        isRiskScoreExist
        user={{ name: 'test user', email: [] }}
        scopeId={'scopeId'}
        hasMisconfigurationFindings={true}
      />,
      {
        wrapper: TestProviders,
      }
    );

    const tabElement = queryByText('Insights');

    expect(tabElement).toBeInTheDocument();
  });
});
