/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { LatestMonitor } from '../../../../common/graphql/types';

export const getApmIntegrationAction = (
  dateRangeStart: string,
  dateRangeEnd: string,
  basePath?: string
) => ({
  description: i18n.translate('xpack.uptime.apmIntegrationAction.description', {
    defaultMessage: 'Search APM for this monitor',
    description:
      'This value is shown to users when they hover over an icon that will take them to the APM app.',
  }),
  icon: 'apmApp',
  isPrimary: true,
  name: i18n.translate('xpack.uptime.apmIntegrationAction.name', {
    defaultMessage: 'APM',
    description: 'The action name is displayed when users view this action in a list',
  }),
  onClick: (monitor: LatestMonitor) =>
    window.location.assign(
      `${basePath && basePath.length ? `/${basePath}` : ''}/app/apm#/services?kuery=${encodeURI(
        `url.domain: "${get(monitor, 'ping.url.domain')}"`
      )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`
    ),
  type: 'icon',
});
