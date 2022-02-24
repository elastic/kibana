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
  const { name, params, alertId, services } = options;
  const timestamp = new Date().toISOString();
  const publicBaseUrl = core.http.basePath.publicBaseUrl ?? '';

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
    throw new Error('Invalid data view without timeFieldName.');
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

  logger.debug(
    `search source query alert (${alertId}) query: ${JSON.stringify(
      searchSourceChild.getSearchRequestBody()
    )}`
  );

  const searchResult = await searchSourceChild.fetch();
  const matchedDocsNumber = Number(searchResult.hits.total);

  logger.debug(
    `search source query alert (${alertId}) number of matched documents: ${matchedDocsNumber}`
  );

  const met = compareFn(matchedDocsNumber, params.threshold);
  if (met) {
    const conditions = `${matchedDocsNumber} is ${getHumanReadableComparator(
      params.thresholdComparator
    )} ${params.threshold}`;
    const checksum = sha256.create().update(JSON.stringify(params));
    const baseContext: ActionContext = {
      title: name,
      message: `${matchedDocsNumber} documents found between ${from} and ${to}`,
      date: timestamp,
      value: Number(matchedDocsNumber),
      conditions,
      link: `${publicBaseUrl}/app/discover#/viewAlert/${alertId}?from=${from}&to=${to}&checksum=${checksum}`,
      hits: searchResult.hits.hits,
    };
    const alertInstance = options.services.alertFactory.create(ConditionMetAlertInstanceId);
    alertInstance.scheduleActions(ActionGroupId, baseContext);
  }

  return { latestTimestamp: timestamp };
}
