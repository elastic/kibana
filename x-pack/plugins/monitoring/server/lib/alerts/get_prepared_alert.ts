/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ICustomClusterClient, UiSettingsServiceStart } from 'kibana/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { AlertServices } from '../../../../alerting/server';
import { AlertCommonCluster } from '../../alerts/types';
import { fetchAvailableCcs } from './fetch_available_ccs';
import { getCcsIndexPattern } from './get_ccs_index_pattern';
import { fetchClusters } from './fetch_clusters';
import { fetchDefaultEmailAddress } from './fetch_default_email_address';

export interface PreparedAlert {
  emailAddress: string;
  clusters: AlertCommonCluster[];
  timezone: string;
  dateFormat: string;
  callCluster: CallCluster;
  indexPattern: string;
}

async function getCallCluster(
  monitoringCluster: ICustomClusterClient,
  services: Pick<AlertServices, 'callCluster'>
): Promise<any> {
  if (!monitoringCluster) {
    return services.callCluster;
  }

  return monitoringCluster.callAsInternalUser;
}

export async function getPreparedAlert(
  alertType: string,
  getUiSettingsService: () => Promise<UiSettingsServiceStart>,
  monitoringCluster: ICustomClusterClient,
  logger: Logger,
  ccsEnabled: boolean,
  _indexPattern: string,
  services: Pick<AlertServices, 'callCluster' | 'savedObjectsClient'>
): Promise<PreparedAlert | null> {
  const callCluster = await getCallCluster(monitoringCluster, services);

  // Support CCS use cases by querying to find available remote clusters
  // and then adding those to the index pattern we are searching against
  let indexPattern = _indexPattern;
  if (ccsEnabled) {
    const availableCcs = await fetchAvailableCcs(callCluster);
    if (availableCcs.length > 0) {
      indexPattern = getCcsIndexPattern(indexPattern, availableCcs);
    }
  }

  const clusters = await fetchClusters(callCluster, indexPattern);

  // Fetch the specific data
  // const data = await dataFetcher(callCluster, clusters, indexPattern);
  // if (data.length === 0) {
  //   logger.warn(`No data found for ${alertType}.`);
  //   return null;
  // }

  const uiSettings = (await getUiSettingsService()).asScopedToClient(services.savedObjectsClient);
  const dateFormat: string = await uiSettings.get<string>('dateFormat');
  const timezone: string = await uiSettings.get<string>('dateFormat:tz');
  const emailAddress = await fetchDefaultEmailAddress(uiSettings);
  if (!emailAddress) {
    // TODO: we can do more here
    logger.warn(`Unable to send email for ${alertType} because there is no email configured.`);
    return null;
  }

  return {
    emailAddress,
    clusters,
    dateFormat,
    timezone,
    callCluster,
    indexPattern,
  };
}
