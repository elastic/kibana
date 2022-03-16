/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { HttpStart, IHttpFetchError, ResponseErrorBody } from 'kibana/public';
import { Legacy } from '../legacy_shims';
import { SetupModeFeature } from '../../common/enums';
import { ISetupModeContext } from '../components/setup_mode/setup_mode_context';
import { State as GlobalState } from '../application/contexts/global_state_context';

let globalState: GlobalState;
let httpService: HttpStart;
let errorHandler: (error: IHttpFetchError<ResponseErrorBody>) => void;

interface ISetupModeState {
  supported: boolean;
  enabled: boolean;
  data: any;
  callback?: (() => void) | null;
  hideBottomBar: boolean;
}
const setupModeState: ISetupModeState = {
  supported: false,
  enabled: false,
  data: null,
  callback: null,
  hideBottomBar: false,
};

export const getSetupModeState = () => setupModeState;

export const setNewlyDiscoveredClusterUuid = (clusterUuid: string) => {
  globalState.cluster_uuid = clusterUuid;
  globalState.save?.();
};

export const fetchCollectionData = async (uuid?: string, fetchWithoutClusterUuid = false) => {
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
    const response = await httpService.post(url, {
      body: JSON.stringify({
        ccs,
      }),
    });
    return response;
  } catch (err) {
    errorHandler(err);
    throw err;
  }
};

const notifySetupModeDataChange = () => setupModeState.callback && setupModeState.callback();

export const updateSetupModeData = async (uuid?: string, fetchWithoutClusterUuid = false) => {
  const data = await fetchCollectionData(uuid, fetchWithoutClusterUuid);
  setupModeState.data = data;
  const hasPermissions = get(data, '_meta.hasPermissions', false);
  if (!hasPermissions) {
    let text: string = '';
    if (!hasPermissions) {
      text = i18n.translate('xpack.monitoring.setupMode.notAvailablePermissions', {
        defaultMessage: 'You do not have the necessary permissions to do this.',
      });
    }

    Legacy.shims.toastNotifications.addDanger({
      title: i18n.translate('xpack.monitoring.setupMode.notAvailableTitle', {
        defaultMessage: 'Setup mode is not available',
      }),
      text,
    });
    return toggleSetupMode(false);
  }
  notifySetupModeDataChange();

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
  const clusterUuid = globalState.cluster_uuid;
  const url = `../api/monitoring/v1/setup/collection/${clusterUuid}/disable_internal_collection`;
  try {
    const response = await httpService.post(url);
    return response;
  } catch (err) {
    errorHandler(err);
    throw err;
  }
};

export const toggleSetupMode = (inSetupMode: boolean) => {
  setupModeState.enabled = inSetupMode;
  globalState.inSetupMode = inSetupMode;
  globalState.save?.();
  notifySetupModeDataChange();

  if (inSetupMode) {
    // Intentionally do not await this so we don't block UI operations
    updateSetupModeData();
  }
};

export const markSetupModeSupported = () => {
  setupModeState.supported = true;
};

export const markSetupModeUnsupported = () => {
  setupModeState.supported = false;
};

export const initSetupModeState = async (
  state: GlobalState,
  http: HttpStart,
  handleErrors: (error: IHttpFetchError<ResponseErrorBody>) => void,
  callback?: () => void
) => {
  globalState = state;
  httpService = http;
  errorHandler = handleErrors;
  if (callback) {
    setupModeState.callback = callback;
  }

  if (globalState.inSetupMode) {
    toggleSetupMode(true);
  }
};

export const isInSetupMode = (context?: ISetupModeContext, gState: GlobalState = globalState) => {
  if (context?.setupModeSupported === false) {
    return false;
  }
  if (setupModeState.enabled) {
    return true;
  }

  return gState.inSetupMode;
};

export const isSetupModeFeatureEnabled = (feature: SetupModeFeature) => {
  if (!setupModeState.enabled) {
    return false;
  }

  if (feature === SetupModeFeature.MetricbeatMigration) {
    if (Legacy.shims.isCloud) {
      return false;
    }
  }

  return true;
};
