/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import {
  AgentUpgradeStatus,
  getDownloadEstimate,
  getUpgradeStartDelay,
} from './agent_upgrade_status';

function getDateString(futureOffsetInMinutes: number): string {
  return new Date(Date.now() + futureOffsetInMinutes * 6e4).toISOString();
}

describe('getUpgradeStartDelay', () => {
  it('should return a user-friendly time estimation', () => {
    expect(getUpgradeStartDelay(getDateString(9))).toEqual(
      ' The upgrade will start in less than 15 minutes.'
    );
    expect(getUpgradeStartDelay(getDateString(25))).toEqual(
      ' The upgrade will start in less than 30 minutes.'
    );
    expect(getUpgradeStartDelay(getDateString(55))).toEqual(
      ' The upgrade will start in less than 1 hour.'
    );
    expect(getUpgradeStartDelay(getDateString(61))).toEqual(
      ' The upgrade will start in less than 2 hours.'
    );
    expect(getUpgradeStartDelay(getDateString(119))).toEqual(
      ' The upgrade will start in less than 2 hours.'
    );
    expect(getUpgradeStartDelay(getDateString(121))).toEqual(
      ' The upgrade will start in less than 3 hours.'
    );
  });
});

describe('getDownloadEstimate', () => {
  it('should return an empty string if the agent does not have a download percent', () => {
    expect(getDownloadEstimate()).toEqual('');
  });

  it('should return an empty string if the agent has a zero download percent', () => {
    expect(getDownloadEstimate(0)).toEqual('');
  });

  it('should return a formatted string if the agent has a positive download percent', () => {
    expect(getDownloadEstimate(16.4)).toEqual(' (16.4%)');
  });
});

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

  function expectUpgradeStatusBadgeLabel(results: any, text: string) {
    expect(results.queryByText(text)).toBeInTheDocument();
    expectNotInDocument(
      results,
      badgeLabels.filter((label) => label !== text)
    );
  }

  function expectNoUpgradeStatusBadges(results: any) {
    expectNotInDocument(results, badgeLabels);
  }

  async function expectTooltip(results: any, text: string) {
    fireEvent.mouseOver(results.getByText('Info'));
    await waitFor(() => {
      expect(results.getByText(text)).toBeInTheDocument();
    });
  }

  describe('with agent upgrade details', () => {
    it('should render UPG_REQUESTED state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_REQUESTED',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade requested');
      await expectTooltip(results, 'The agent has requested an upgrade.');
    });

    it('should render UPG_SCHEDULED state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_SCHEDULED',
          metadata: {
            scheduled_at: getDateString(200),
          },
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade scheduled');
      await expectTooltip(
        results,
        'The agent has been instructed to upgrade. The upgrade will start in less than 4 hours.'
      );
    });

    it('should render UPG_DOWNLOADING state correctly', async () => {
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

      expectUpgradeStatusBadgeLabel(results, 'Upgrade downloading');
      await expectTooltip(results, 'Downloading the new agent artifact version (16.4%).');
    });

    it('should render UPG_EXTRACTING state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_EXTRACTING',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade extracting');
      await expectTooltip(results, 'The new agent artifact is extracting.');
    });

    it('should render UPG_REPLACING state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_REPLACING',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade replacing');
      await expectTooltip(results, 'Replacing the agent artifact version.');
    });

    it('should render UPG_RESTARTING state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_RESTARTING',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade restarting');
      await expectTooltip(results, 'The agent is restarting to apply the update.');
    });

    it('should render UPG_WATCHING state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_WATCHING',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade monitoring');
      await expectTooltip(results, 'Monitoring the new agent version for errors.');
    });

    it('should render UPG_ROLLBACK state correctly', async () => {
      const results = render({
        agentUpgradeDetails: {
          target_version: 'XXX',
          action_id: 'xxx',
          state: 'UPG_ROLLBACK',
        },
      });

      expectUpgradeStatusBadgeLabel(results, 'Upgrade rolled back');
      await expectTooltip(results, 'Upgrade unsuccessful. Rolling back to previous version.');
    });

    it('should render UPG_FAILED state correctly', async () => {
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

      expectUpgradeStatusBadgeLabel(results, 'Upgrade failed');
      await expectTooltip(results, 'Upgrade failed: Something went wrong.');
    });
  });

  describe('with no agent upgrade details', () => {
    it('should render a badge with no tooltip if the agent is upgradable', () => {
      const results = render({
        isAgentUpgradable: true,
      });

      expectNoUpgradeStatusBadges(results);
      expect(results.queryByText('Upgrade available')).toBeInTheDocument();
      expect(results.queryAllByText('Info')).toEqual([]);
    });

    // Unskip this test when minVersion is set.
    it.skip('should render an icon with tooltip if the agent is upgrading', async () => {
      const results = render({
        agentUpgradeStartedAt: '2023-10-03T14:34:12Z',
        agentUpgradedAt: null,
      });

      expectNoUpgradeStatusBadges(results);
      expect(results.getByText('Info')).toBeInTheDocument();

      await expectTooltip(
        results,
        'Detailed upgrade status is available for Elastic Agents on version 8.12 and higher.'
      );
    });

    it('should not render anything if the agent is neither upgrading nor upgradable', () => {
      const results = render({
        agentUpgradeStartedAt: null,
        agentUpgradedAt: '2023-10-03T14:34:12Z',
      });
      expectNoUpgradeStatusBadges(results);
      expect(
        results.container.querySelector('[data-euiicon-type="iInCircle"]')
      ).not.toBeInTheDocument();
    });
  });
});
