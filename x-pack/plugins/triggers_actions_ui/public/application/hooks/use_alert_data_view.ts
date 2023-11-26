/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { useAlertDataView as useAlertDataViewShared } from '@kbn/alerts-ui-shared';
import { TriggersAndActionsUiServices } from '../..';

export function useAlertDataView(featureIds: ValidFeatureId[]) {
  const {
    http,
    data: dataService,
    notifications: { toasts },
  } = useKibana<TriggersAndActionsUiServices>().services;

  return useAlertDataViewShared({
    featureIds,
    dataViewsService: dataService.dataViews,
    http,
    toasts,
  });
}
