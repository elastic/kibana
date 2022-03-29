/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../state/kibana_service';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { ServiceLocationErrors, ServiceLocations } from '../../../common/runtime_types';

export const showSyncErrors = (errors: ServiceLocationErrors, locations: ServiceLocations) => {
  Object.values(errors).forEach((location) => {
    const { status: responseStatus, reason } = location.error || {};
    const locationName = locations?.find((loc) => loc?.id === location.locationId)?.label;

    const isPublicBetaError = reason?.toLocaleLowerCase().includes('public beta');

    kibanaService.toasts.addWarning({
      title: isPublicBetaError ? BETA_ERROR_MESSAGE : UNABLE_SYNC_MESSAGE,
      text: toMountPoint(
        <>
          <p>
            {!isPublicBetaError
              ? getSyncErrorDescription(locationName)
              : getBetaErrorDescription(locationName)}
          </p>
          {responseStatus || reason ? (
            <p>
              {responseStatus
                ? i18n.translate('xpack.uptime.monitorManagement.service.error.status', {
                    defaultMessage: 'Status: {status}. ',
                    values: { status: responseStatus },
                  })
                : null}
              {reason
                ? i18n.translate('xpack.uptime.monitorManagement.service.error.reason', {
                    defaultMessage: 'Reason: {reason}.',
                    values: { reason },
                  })
                : null}
            </p>
          ) : null}
        </>
      ),
      toastLifeTimeMs: isPublicBetaError ? 60000 : 30000,
    });
  });
};

const BETA_ERROR_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.service.error.betaError',
  {
    defaultMessage: 'Monitors are not running.',
  }
);

const UNABLE_SYNC_MESSAGE = i18n.translate(
  'xpack.uptime.monitorManagement.service.error.unableToSync',
  {
    defaultMessage: 'Unable to sync monitor config',
  }
);

const getSyncErrorDescription = (locationName?: string) =>
  i18n.translate('xpack.uptime.monitorManagement.service.error.message', {
    defaultMessage: `Your monitor was saved, but there was a problem syncing the configuration for {location}. We will automatically try again later. If this problem continues, your monitors will stop running in {location}. Please contact Support for assistance.`,
    values: {
      location: locationName,
    },
  });

const getBetaErrorDescription = (locationName?: string) =>
  i18n.translate('xpack.uptime.monitorManagement.service.beta.error.message', {
    defaultMessage:
      'Due to public beta fair usage policy, monitors are not running in location {location}. Monitors will reset tomorrow.',
    values: {
      location: locationName,
    },
  });
