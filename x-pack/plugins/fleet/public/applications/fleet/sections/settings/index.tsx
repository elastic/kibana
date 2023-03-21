/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPortal } from '@elastic/eui';
import { Router, Switch, useHistory, Redirect } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import {
  useBreadcrumbs,
  useGetOutputs,
  useGetDownloadSources,
  useGetFleetServerHosts,
  useFlyoutContext,
  useGetFleetProxies,
} from '../../hooks';
import { FLEET_ROUTING_PATHS, pagePathGetters } from '../../constants';
import { DefaultLayout } from '../../layouts';
import { Loading } from '../../components';

import { FleetServerFlyout } from '../../components';

import { SettingsPage } from './components/settings_page';
import { withConfirmModalProvider } from './hooks/use_confirm_modal';
import { FleetServerHostsFlyout } from './components/fleet_server_hosts_flyout';
import { EditOutputFlyout } from './components/edit_output_flyout';
import { useDeleteOutput, useDeleteFleetServerHost, useDeleteProxy } from './hooks';
import { EditDownloadSourceFlyout } from './components/download_source_flyout';
import { useDeleteDownloadSource } from './components/download_source_flyout/use_delete_download_source';
import { FleetProxyFlyout } from './components/edit_fleet_proxy_flyout';

function useSettingsAppData() {
  const outputs = useGetOutputs();
  const fleetServerHosts = useGetFleetServerHosts();
  const downloadSources = useGetDownloadSources();
  const proxies = useGetFleetProxies();

  return { outputs, fleetServerHosts, downloadSources, proxies };
}

export const SettingsApp = withConfirmModalProvider(() => {
  useBreadcrumbs('settings');
  const history = useHistory();

  const flyoutContext = useFlyoutContext();

  const { outputs, fleetServerHosts, downloadSources, proxies } = useSettingsAppData();

  const { deleteOutput } = useDeleteOutput(outputs.resendRequest);
  const { deleteDownloadSource } = useDeleteDownloadSource(downloadSources.resendRequest);
  const { deleteFleetServerHost } = useDeleteFleetServerHost(fleetServerHosts.resendRequest);
  const { deleteFleetProxy } = useDeleteProxy(proxies.resendRequest);

  const resendOutputRequest = outputs.resendRequest;
  const resendDownloadSourceRequest = downloadSources.resendRequest;
  const resendFleetServerHostsRequest = fleetServerHosts.resendRequest;
  const resendProxiesRequest = proxies.resendRequest;

  const onCloseCallback = useCallback(() => {
    flyoutContext.closeFleetServerFlyout();
    resendOutputRequest();
    resendDownloadSourceRequest();
    resendFleetServerHostsRequest();
    resendProxiesRequest();
    history.replace(pagePathGetters.settings()[1]);
  }, [
    flyoutContext,
    resendOutputRequest,
    resendDownloadSourceRequest,
    resendFleetServerHostsRequest,
    resendProxiesRequest,
    history,
  ]);

  if (
    (outputs.isLoading && outputs.isInitialRequest) ||
    !outputs.data?.items ||
    (fleetServerHosts.isLoading && fleetServerHosts.isInitialRequest) ||
    !fleetServerHosts.data?.items ||
    (downloadSources.isLoading && downloadSources.isInitialRequest) ||
    !downloadSources.data?.items ||
    (proxies.isLoading && proxies.isInitialRequest) ||
    !proxies.data?.items
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
            {(route: { match: { params: { itemId: string } } }) => {
              const fleetServerHost = fleetServerHosts.data?.items.find(
                (o) => route.match.params.itemId === o.id
              );
              if (!fleetServerHost) {
                return <Redirect to={FLEET_ROUTING_PATHS.settings} />;
              }

              return (
                <EuiPortal>
                  <FleetServerHostsFlyout
                    proxies={proxies.data?.items ?? []}
                    onClose={onCloseCallback}
                    fleetServerHost={fleetServerHost}
                  />
                </EuiPortal>
              );
            }}
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_create_fleet_server_hosts}>
            <EuiPortal>
              <FleetServerFlyout onClose={onCloseCallback} />
            </EuiPortal>
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_create_outputs}>
            <EuiPortal>
              <EditOutputFlyout proxies={proxies.data.items} onClose={onCloseCallback} />
            </EuiPortal>
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_create_fleet_proxy}>
            <EuiPortal>
              <FleetProxyFlyout onClose={onCloseCallback} />
            </EuiPortal>
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_edit_fleet_proxy}>
            {(route: { match: { params: { itemId: string } } }) => {
              const fleetProxy = proxies.data?.items.find(
                (item) => route.match.params.itemId === item.id
              );
              if (!fleetProxy) {
                return <Redirect to={FLEET_ROUTING_PATHS.settings} />;
              }
              return (
                <EuiPortal>
                  <FleetProxyFlyout onClose={onCloseCallback} fleetProxy={fleetProxy} />
                </EuiPortal>
              );
            }}
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_edit_outputs}>
            {(route: { match: { params: { outputId: string } } }) => {
              const output = outputs.data?.items.find((o) => route.match.params.outputId === o.id);
              if (!output) {
                return <Redirect to={FLEET_ROUTING_PATHS.settings} />;
              }

              return (
                <EuiPortal>
                  <EditOutputFlyout
                    proxies={proxies.data?.items ?? []}
                    onClose={onCloseCallback}
                    output={output}
                  />
                </EuiPortal>
              );
            }}
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_create_download_sources}>
            <EuiPortal>
              <EditDownloadSourceFlyout onClose={onCloseCallback} />
            </EuiPortal>
          </Route>
          <Route path={FLEET_ROUTING_PATHS.settings_edit_download_sources}>
            {(route: { match: { params: { downloadSourceId: string } } }) => {
              const downloadSource = downloadSources.data?.items.find(
                (o) => route.match.params.downloadSourceId === o.id
              );
              if (!downloadSource) {
                return <Redirect to={FLEET_ROUTING_PATHS.settings} />;
              }

              return (
                <EuiPortal>
                  <EditDownloadSourceFlyout
                    onClose={onCloseCallback}
                    downloadSource={downloadSource}
                  />
                </EuiPortal>
              );
            }}
          </Route>
        </Switch>
      </Router>
      <SettingsPage
        deleteFleetProxy={deleteFleetProxy}
        proxies={proxies.data.items}
        outputs={outputs.data.items}
        fleetServerHosts={fleetServerHosts.data.items}
        deleteOutput={deleteOutput}
        deleteFleetServerHost={deleteFleetServerHost}
        downloadSources={downloadSources.data.items}
        deleteDownloadSource={deleteDownloadSource}
      />
    </DefaultLayout>
  );
});
