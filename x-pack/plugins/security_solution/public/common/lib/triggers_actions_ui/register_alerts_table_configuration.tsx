/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import { APP_ID } from '../../../../common/constants';

export const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract
) => {
  registry.register({
    id: APP_ID,
    columns: [
      {
        id: '@timestamp',
        initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
      },
      {
        id: 'message',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'event.category',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'event.action',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'host.name',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'source.ip',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'destination.ip',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
      {
        id: 'user.name',
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      },
    ],
  });
};
