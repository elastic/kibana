/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { sha256 } from 'js-sha256';
import { CoreSetup, Logger } from 'src/core/server';
import { getTime } from '../../../../../../../src/plugins/data/common';
import { ActionContext } from '../action_context';
import { ComparatorFns, getHumanReadableComparator } from '../../lib';
import { ExecutorOptions, OnlySearchSourceAlertParams } from '../types';
import { ActionGroupId, ConditionMetAlertInstanceId } from '../constants';

export async function searchSourceExecutor(
  logger: Logger,
  core: CoreSetup,
  options: ExecutorOptions<OnlySearchSourceAlertParams>
) {
  const { name, params, alertId, state, services } = options;
  const timestamp = new Date().toISOString();
  const publicBaseUrl = core.http.basePath.publicBaseUrl ?? '';

  logger.debug(
    `searchThreshold (${alertId}) previousTimestamp: ${state.previousTimestamp}, previousTimeRange ${state.previousTimeRange}`
  );

  const compareFn = ComparatorFns.get(params.thresholdComparator);
  if (compareFn == null) {
    throw new Error(
      i18n.translate('xpack.stackAlerts.searchThreshold.invalidComparatorErrorMessage', {
        defaultMessage: 'invalid thresholdComparator specified: {comparator}',
        values: {
          comparator: params.thresholdComparator,
        },
      })
    );
  }

  const searchSourceClient = await services.searchSourceClient;
  const loadedSearchSource = await searchSourceClient.create(params.searchConfiguration);
  const index = loadedSearchSource.getField('index');

  const timeFieldName = index?.timeFieldName;
  if (!timeFieldName) {
    throw new Error('Invalid data view without timeFieldName');
  }

  loadedSearchSource.setField('size', params.size);

  const filter = getTime(index, {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  });
  const from = filter?.query.range[timeFieldName].gte;
  const to = filter?.query.range[timeFieldName].lte;
  const searchSourceChild = loadedSearchSource.createChild();
  searchSourceChild.setField('filter', filter);

  let nrOfDocs = 0;
  let searchResult;
  try {
    logger.info(
      `searchThreshold (${alertId}) query: ${JSON.stringify(
        searchSourceChild.getSearchRequestBody()
      )}`
    );
    searchResult = await searchSourceChild.fetch();
    nrOfDocs = Number(searchResult.hits.total);
    logger.info(`searchThreshold (${alertId}) nrOfDocs: ${nrOfDocs}`);
  } catch (error) {
    logger.error('Error fetching documents: ' + error.message);
    throw error;
  }

  const met = compareFn(nrOfDocs, params.threshold);

  if (met) {
    const conditions = `${nrOfDocs} is ${getHumanReadableComparator(params.thresholdComparator)} ${
      params.threshold
    }`;
    const checksum = sha256.create().update(JSON.stringify(params));
    const link = `${publicBaseUrl}/app/discover#/viewAlert/${alertId}?from=${from}&to=${to}&checksum=${checksum}`;
    const baseContext: ActionContext = {
      title: name,
      message: `${nrOfDocs} documents found between ${from} and ${to}`,
      date: timestamp,
      value: Number(nrOfDocs),
      conditions,
      link,
      hits: searchResult.hits.hits,
    };
    const alertInstance = options.services.alertFactory.create(ConditionMetAlertInstanceId);
    alertInstance.scheduleActions(ActionGroupId, baseContext);
  }

  // this is the state that we can access in the next execution
  return {
    latestTimestamp: timestamp,
  };
}
