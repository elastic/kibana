/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPortal } from '@elastic/eui';
import { Router, Route, Switch, useHistory, Redirect } from 'react-router-dom';

import { useBreadcrumbs, useGetOutputs, useGetSettings } from '../../hooks';
import { FLEET_ROUTING_PATHS, pagePathGetters } from '../../constants';
import { DefaultLayout } from '../../layouts';
import { Loading } from '../../components';

import { SettingsPage } from './components/settings_page';
import { withConfirmModalProvider } from './hooks/use_confirm_modal';
import { FleetServerHostsFlyout } from './components/fleet_server_hosts_flyout';
import { EditOutputFlyout } from './components/edit_output_flyout';
import { useDeleteOutput } from './hooks/use_delete_output';

export const SettingsApp = withConfirmModalProvider(() => {
  useBreadcrumbs('settings');
  const history = useHistory();

  const settings = useGetSettings();
  const outputs = useGetOutputs();

  const { deleteOutput } = useDeleteOutput(outputs.resendRequest);

  const resendSettingsRequest = settings.resendRequest;
  const resendOutputRequest = outputs.resendRequest;

  const onCloseCallback = useCallback(() => {
    resendSettingsRequest();
    resendOutputRequest();
    history.replace(pagePathGetters.settings()[1]);
  }, [history, resendSettingsRequest, resendOutputRequest]);

  if (
    (settings.isLoading && settings.isInitialRequest) ||
    !settings.data?.item ||
    (outputs.isLoading && outputs.isInitialRequest) ||
    !outputs.data?.items
  ) {
    return (
      <DefaultLayout section="settings">
        <Loading />
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout section="settings">
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
          <Route path={FLEET_ROUTING_PATHS.settings_create_outputs}>
            <EuiPortal>
              <EditOutputFlyout onClose={onCloseCallback} />
            </EuiPortal>
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_edit_outputs}>
            {(route: { match: { params: { outputId: string } } }) => {
              const output = outputs.data?.items.find((o) => route.match.params.outputId === o.id);

              if (!output) {
                return <Redirect to={FLEET_ROUTING_PATHS.settings} />;
              }

              return (
                <EuiPortal>
                  <EditOutputFlyout onClose={onCloseCallback} output={output} />
                </EuiPortal>
              );
            }}
          </Route>
        </Switch>
      </Router>
      <SettingsPage
        settings={settings.data.item}
        outputs={outputs.data.items}
        deleteOutput={deleteOutput}
      />
    </DefaultLayout>
  );
});
