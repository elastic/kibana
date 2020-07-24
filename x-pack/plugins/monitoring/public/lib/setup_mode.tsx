/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { get, includes } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../legacy_shims';
import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { SetupModeEnterButton } from '../components/setup_mode/enter_button';

function isOnPage(hash: string) {
  return includes(window.location.hash, hash);
}

interface IAngularState {
  injector: any;
  scope: any;
}

const angularState: IAngularState = {
  injector: null,
  scope: null,
};

const checkAngularState = () => {
  if (!angularState.injector || !angularState.scope) {
    throw new Error(
      'Unable to interact with setup mode because the angular injector was not previously set.' +
        ' This needs to be set by calling `initSetupModeState`.'
    );
  }
};

interface ISetupModeState {
  enabled: boolean;
  data: any;
  callback?: (() => void) | null;
  hideBottomBar: boolean;
}
const setupModeState: ISetupModeState = {
  enabled: false,
  data: null,
  callback: null,
  hideBottomBar: false,
};

export const getSetupModeState = () => setupModeState;

export const setNewlyDiscoveredClusterUuid = (clusterUuid: string) => {
  const globalState = angularState.injector.get('globalState');
  const executor = angularState.injector.get('$executor');
  angularState.scope.$apply(() => {
    globalState.cluster_uuid = clusterUuid;
    globalState.save();
  });
  executor.run();
};

export const fetchCollectionData = async (uuid?: string, fetchWithoutClusterUuid = false) => {
  checkAngularState();

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;

  let url = '../api/monitoring/v1/setup/collection';
  if (uuid) {
    url += `/node/${uuid}`;
  } else if (!fetchWithoutClusterUuid && clusterUuid) {
    url += `/cluster/${clusterUuid}`;
  } else {
    url += '/cluster';
  }

  try {
    const response = await http.post(url, { ccs });
    return response.data;
  } catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

const notifySetupModeDataChange = () => setupModeState.callback && setupModeState.callback();

export const updateSetupModeData = async (uuid?: string, fetchWithoutClusterUuid = false) => {
  const data = await fetchCollectionData(uuid, fetchWithoutClusterUuid);
  setupModeState.data = data;
  const hasPermissions = get(data, '_meta.hasPermissions', false);
  if (Legacy.shims.isCloud || !hasPermissions) {
    let text: string = '';
    if (!hasPermissions) {
      text = i18n.translate('xpack.monitoring.setupMode.notAvailablePermissions', {
        defaultMessage: 'You do not have the necessary permissions to do this.',
      });
    } else {
      text = i18n.translate('xpack.monitoring.setupMode.notAvailableCloud', {
        defaultMessage: 'This feature is not available on cloud.',
      });
    }

    angularState.scope.$evalAsync(() => {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.setupMode.notAvailableTitle', {
          defaultMessage: 'Setup mode is not available',
        }),
        text,
      });
    });
    return toggleSetupMode(false); // eslint-disable-line no-use-before-define
  }
  notifySetupModeDataChange();

  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  if (!clusterUuid) {
    const liveClusterUuid: string = get(data, '_meta.liveClusterUuid');
    const migratedEsNodes = Object.values(get(data, 'elasticsearch.byUuid', {})).filter(
      (node: any) => node.isPartiallyMigrated || node.isFullyMigrated
    );
    if (liveClusterUuid && migratedEsNodes.length > 0) {
      setNewlyDiscoveredClusterUuid(liveClusterUuid);
    }
  }
};

export const hideBottomBar = () => {
  setupModeState.hideBottomBar = true;
  notifySetupModeDataChange();
};
export const showBottomBar = () => {
  setupModeState.hideBottomBar = false;
  notifySetupModeDataChange();
};

export const disableElasticsearchInternalCollection = async () => {
  checkAngularState();

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const url = `../api/monitoring/v1/setup/collection/${clusterUuid}/disable_internal_collection`;
  try {
    const response = await http.post(url);
    return response.data;
  } catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

export const toggleSetupMode = (inSetupMode: boolean) => {
  checkAngularState();

  const globalState = angularState.injector.get('globalState');
  setupModeState.enabled = inSetupMode;
  globalState.inSetupMode = inSetupMode;
  globalState.save();
  setSetupModeMenuItem(); // eslint-disable-line  no-use-before-define
  notifySetupModeDataChange();

  if (inSetupMode) {
    // Intentionally do not await this so we don't block UI operations
    updateSetupModeData();
  }
};

export const setSetupModeMenuItem = () => {
  checkAngularState();

  if (isOnPage('no-data')) {
    return;
  }

  const globalState = angularState.injector.get('globalState');
  const enabled = !globalState.inSetupMode && !Legacy.shims.isCloud;

  render(
    <SetupModeEnterButton enabled={enabled} toggleSetupMode={toggleSetupMode} />,
    document.getElementById('setupModeNav')
  );
};

export const addSetupModeCallback = (callback: () => void) => (setupModeState.callback = callback);

export const initSetupModeState = async ($scope: any, $injector: any, callback?: () => void) => {
  angularState.scope = $scope;
  angularState.injector = $injector;
  if (callback) {
    setupModeState.callback = callback;
  }

  const globalState = $injector.get('globalState');
  if (globalState.inSetupMode) {
    await toggleSetupMode(true);
  }
};

export const isInSetupMode = () => {
  if (setupModeState.enabled) {
    return true;
  }

  const $injector = angularState.injector || Legacy.shims.getAngularInjector();
  const globalState = $injector.get('globalState');
  return globalState.inSetupMode;
};
