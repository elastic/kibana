/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render,
  forNearestButton,
  makeUptimePermissionsCore,
} from '../../../lib/helper/rtl_helpers';
import { ToggleAlertFlyoutButtonComponent } from './toggle_alert_flyout_button';
import { ToggleFlyoutTranslations } from './translations';

describe('ToggleAlertFlyoutButtonComponent', () => {
  describe('when users have write access to uptime', () => {
    it('enables the button to create a rule', () => {
      const { getByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: true }) }
      );
      userEvent.click(getByText('Alerts and rules'));
      expect(
        forNearestButton(getByText)(ToggleFlyoutTranslations.openAlertContextPanelLabel)
      ).toBeEnabled();
    });

    it("does not contain a tooltip explaining why the user can't create alerts", async () => {
      const { getByText, findByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: true }) }
      );
      userEvent.click(getByText('Alerts and rules'));
      userEvent.hover(getByText(ToggleFlyoutTranslations.openAlertContextPanelLabel));
      await expect(() =>
        findByText('You need read-write access to Uptime to create alerts in this app.')
      ).rejects.toEqual(expect.anything());
    });
  });

  describe("when users don't have write access to uptime", () => {
    it('disables the button to create a rule', () => {
      const { getByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: false }) }
      );
      userEvent.click(getByText('Alerts and rules'));
      expect(
        forNearestButton(getByText)(ToggleFlyoutTranslations.openAlertContextPanelLabel)
      ).toBeDisabled();
    });

    it("contains a tooltip explaining why users can't create rules", async () => {
      const { getByText, findByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: false }) }
      );
      userEvent.click(getByText('Alerts and rules'));
      userEvent.hover(getByText(ToggleFlyoutTranslations.openAlertContextPanelLabel));
      expect(
        await findByText('You need read-write access to Uptime to create alerts in this app.')
      ).toBeInTheDocument();
    });
  });
});
