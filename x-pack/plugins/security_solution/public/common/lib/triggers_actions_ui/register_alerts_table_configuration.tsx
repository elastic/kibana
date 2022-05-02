/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';

import { APP_ID } from '../../../../common/constants';
import { getTimelinesInStorageByIds } from '../../../timelines/containers/local_storage';
import { TimelineId } from '../../../../common/types';
import { columns } from '../../../detections/configurations/security_solution_detections';

const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract,
  storage: Storage
) => {
  if (registry.has(APP_ID)) {
    return;
  }
  const timelineStorage = getTimelinesInStorageByIds(storage, [TimelineId.detectionsPage]);
  const alertColumns = timelineStorage?.[TimelineId.detectionsPage]?.columns ?? columns;
  registry.register({
    id: APP_ID,
    columns: alertColumns,
  });
};

export { registerAlertsTableConfiguration };
