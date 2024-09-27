/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen, screen } from '@elastic/eui/lib/test/rtl';
import { ManageMLJobComponent } from './manage_ml_job';
import {
  render,
  makeUptimePermissionsCore,
  forNearestButton,
} from '../../../lib/helper/rtl_helpers';
import * as labels from './translations';

describe('Manage ML Job', () => {
  const makeMlCapabilities = (mlCapabilities?: Partial<{ canDeleteJob: boolean }>) => {
    return {
      ml: {
        mlCapabilities: { data: { capabilities: { canDeleteJob: true, ...mlCapabilities } } },
      },
    };
  };

  describe('when users have write access to uptime', () => {
    it('enables the button to create alerts', async () => {
      const { getByText } = render(
        <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />,
        {
          state: makeMlCapabilities(),
          core: makeUptimePermissionsCore({ save: true }),
        }
      );

      const anomalyDetectionBtn = forNearestButton(getByText)(labels.ANOMALY_DETECTION);
      expect(anomalyDetectionBtn).toBeInTheDocument();
      await userEvent.click(anomalyDetectionBtn as HTMLElement);

      expect(forNearestButton(getByText)(labels.ENABLE_ANOMALY_ALERT)).toBeEnabled();
    });

    it('does not display an informative tooltip', async () => {
      const { getByText, queryByText } = render(
        <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />,
        {
          state: makeMlCapabilities(),
          core: makeUptimePermissionsCore({ save: true }),
        }
      );

      const anomalyDetectionBtn = forNearestButton(getByText)(labels.ANOMALY_DETECTION);
      expect(anomalyDetectionBtn).toBeInTheDocument();
      await userEvent.click(anomalyDetectionBtn as HTMLElement);
      await waitForEuiPopoverOpen();

      await userEvent.hover(getByText(labels.ENABLE_ANOMALY_ALERT));
      expect(
        await queryByText('You need write access to Uptime to create anomaly alerts.')
      ).toBeNull();
    });
  });

  describe("when users don't have write access to uptime", () => {
    it('disables the button to create alerts', async () => {
      const { getByText } = render(
        <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />,
        {
          state: makeMlCapabilities(),
          core: makeUptimePermissionsCore({ save: false }),
        }
      );

      const anomalyDetectionBtn = forNearestButton(getByText)(labels.ANOMALY_DETECTION);
      expect(anomalyDetectionBtn).toBeInTheDocument();
      await userEvent.click(anomalyDetectionBtn as HTMLElement);

      expect(forNearestButton(getByText)(labels.ENABLE_ANOMALY_ALERT)).toBeDisabled();
    });

    it('displays an informative tooltip', async () => {
      const { getByText, findByText } = render(
        <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />,
        {
          state: makeMlCapabilities(),
          core: makeUptimePermissionsCore({ save: false }),
        }
      );

      const anomalyDetectionBtn = forNearestButton(getByText)(labels.ANOMALY_DETECTION);
      expect(anomalyDetectionBtn).toBeInTheDocument();
      await userEvent.click(anomalyDetectionBtn as HTMLElement);
      await waitForEuiPopoverOpen();

      await userEvent.hover(
        screen.getByTestSubject('uptimeEnableAnomalyAlertBtn').closest('span') as HTMLElement
      );
      expect(
        await findByText('You need read-write access to Uptime to create anomaly alerts.')
      ).toBeInTheDocument();
    });
  });
});
