/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { AgentUpgradeStatus } from './agent_upgrade_status';

describe('AgentUpgradeStatus', () => {
  function render(props: any) {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<AgentUpgradeStatus {...props} />);
  }

  const badgeLabels = [
    'Upgrade requested',
    'Upgrade scheduled',
    'Upgrade downloading',
    'Upgrade extracting',
    'Upgrade replacing',
    'Upgrade restarting',
    'Upgrade monitoring',
    'Upgrade rolled back',
    'Upgrade failed',
  ];

  function expectNotInDocument(results: any, texts: string[]) {
    texts.forEach((text) => {
      expect(results.queryByText(text)).not.toBeInTheDocument();
    });
  }

  function expectBadgeLabel(results: any, text: string) {
    expect(results.queryByText(text)).toBeInTheDocument();
    expectNotInDocument(
      results,
      badgeLabels.filter((label) => label !== text)
    );
  }

  function expectNoBadges(results: any) {
    expectNotInDocument(results, badgeLabels);
  }

  describe('with agent upgrade details', () => {
    it('should render UPG_REQUESTED state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_REQUESTED',
        },
      });
      expectBadgeLabel(results, 'Upgrade requested');
    });

    it('should render UPG_SCHEDULED state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_SCHEDULED',
          metadata: {
            scheduled_at: '2023-08-09T10:11:12Z',
          },
        },
      });
      expectBadgeLabel(results, 'Upgrade scheduled');
    });

    it('should render UPG_DOWNLOADING state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_DOWNLOADING',
          metadata: {
            download_percent: 16.4,
          },
        },
      });
      expectBadgeLabel(results, 'Upgrade downloading');
    });

    it('should render UPG_EXTRACTING state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_EXTRACTING',
        },
      });
      expectBadgeLabel(results, 'Upgrade extracting');
    });

    it('should render UPG_REPLACING state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_REPLACING',
        },
      });
      expectBadgeLabel(results, 'Upgrade replacing');
    });

    it('should render UPG_RESTARTING state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_RESTARTING',
        },
      });
      expectBadgeLabel(results, 'Upgrade restarting');
    });

    it('should render UPG_WATCHING state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_WATCHING',
        },
      });
      expectBadgeLabel(results, 'Upgrade monitoring');
    });

    it('should render UPG_ROLLBACK state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_ROLLBACK',
        },
      });
      expectBadgeLabel(results, 'Upgrade rolled back');
    });

    it('should render UPG_FAILED state correctly', () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_FAILED',
          metadata: {
            failed_state: 'UPG_DOWNLOADING',
            error_msg: 'Something went wrong',
          },
        },
      });
      expectBadgeLabel(results, 'Upgrade failed');
    });
  });

  describe('with no agent upgrade details', () => {
    it('should render an icon with tooltip if the agent is upgrading', () => {
      const results = render({
        agentUpgradeStartedAt: '2023-10-03T14:34:12Z',
        agentUpgradedAt: null,
      });
      expectNoBadges(results);
      expect(
        results.container.querySelector('[data-euiicon-type="iInCircle"]')
      ).toBeInTheDocument();
    });

    it('should not render anything if the agent is not upgrading', () => {
      const results = render({
        agentUpgradeStartedAt: null,
        agentUpgradedAt: '2023-10-03T14:34:12Z',
      });
      expectNoBadges(results);
      expect(
        results.container.querySelector('[data-euiicon-type="iInCircle"]')
      ).not.toBeInTheDocument();
    });
  });
});
