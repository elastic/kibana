/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPortal } from '@elastic/eui';
import { Router, Route, Switch, useHistory } from 'react-router-dom';

import { useBreadcrumbs, useGetSettings } from '../../hooks';
import { FLEET_ROUTING_PATHS, pagePathGetters } from '../../constants';
import { DefaultLayout } from '../../layouts';
import { Loading } from '../../components';

import { SettingsPage } from './components/settings_page';
import { ConfirmModalProvider } from './hooks/use_confirm_modal';
import { FleetServerHostsFlyout } from './components/fleet_server_hosts_flyout';

export const SettingsApp = () => {
  useBreadcrumbs('settings');
  const history = useHistory();

  const settings = useGetSettings();

  const resendSettingsRequest = settings.resendRequest;

  const onCloseCallback = useCallback(() => {
    resendSettingsRequest();
    history.replace(pagePathGetters.settings()[1]);
  }, [history, resendSettingsRequest]);

  if (settings.isLoading || !settings.data?.item) {
    return (
      <DefaultLayout section="settings">
        <Loading />
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout section="settings">
      <ConfirmModalProvider>
        <Router history={history}>
          <Switch>
            <Route path={FLEET_ROUTING_PATHS.settings_edit_fleet_server_hosts}>
              <EuiPortal>
                <FleetServerHostsFlyout
                  onClose={onCloseCallback}
                  fleetServerHosts={settings.data?.item.fleet_server_hosts ?? []}
                />
              </EuiPortal>
            </Route>
          </Switch>
        </Router>
        <SettingsPage settings={settings.data.item} />
      </ConfirmModalProvider>
    </DefaultLayout>
  );
};
