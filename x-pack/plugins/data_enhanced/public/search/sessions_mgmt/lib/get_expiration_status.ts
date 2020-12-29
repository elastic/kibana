/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';

export const getExpirationStatus = (durationToExpire: moment.Duration, expiresInDays: number) => {
  let toolTipContent = i18n.translate('xpack.data.mgmt.searchSessions.status.expiresSoonInDays', {
    defaultMessage: 'Expires in {numDays} days',
    values: { numDays: expiresInDays },
  });
  let statusContent = i18n.translate(
    'xpack.data.mgmt.searchSessions.status.expiresSoonInDaysTooltip',
    { defaultMessage: '{numDays} days', values: { numDays: expiresInDays } }
  );

  if (expiresInDays === 0) {
    // switch to show expires in hours
    const expiresInHours = Math.floor(durationToExpire.asHours());

    toolTipContent = i18n.translate('xpack.data.mgmt.searchSessions.status.expiresSoonInHours', {
      defaultMessage: 'This session expires in {numHours} hours',
      values: { numHours: expiresInHours },
    });
    statusContent = i18n.translate(
      'xpack.data.mgmt.searchSessions.status.expiresSoonInHoursTooltip',
      { defaultMessage: '{numHours} hours', values: { numHours: expiresInHours } }
    );
  }

  return { toolTipContent, statusContent };
};
