/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_DATABASE_MODAL_TITLE_ID = 'manageProcessorsAddGeoipDatabase';
export const ADD_DATABASE_MODAL_FORM_ID = 'manageProcessorsAddGeoipDatabaseForm';
export const DATABASE_NAME_OPTIONS = [
  {
    value: 'GeoIP2-Anonymous-IP',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 Anonymous IP',
      }
    ),
  },
  {
    value: 'GeoIP2-City',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 City',
      }
    ),
  },
  {
    value: 'GeoIP2-Connection-Type',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 Connection Type',
      }
    ),
  },
  {
    value: 'GeoIP2-Country',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 Country',
      }
    ),
  },
  {
    value: 'GeoIP2-Domain',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 Domain',
      }
    ),
  },
  {
    value: 'GeoIP2-Enterprise',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 Enterprise',
      }
    ),
  },
  {
    value: 'GeoIP2-ISP',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.geoipAnonymousDatabaseName',
      {
        defaultMessage: 'GeoIP2 ISP',
      }
    ),
  },
];

export const invalidFormError = i18n.translate(
  'xpack.ingestPipelines.manageProcessors.geoip.addDatabaseInvalidFormError',
  {
    defaultMessage: 'A MaxMind Account ID and a database are required',
  }
);

export const getAddDatabaseSuccessMessage = (databaseName: string): string => {
  return i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.addDatabaseSuccessMessage', {
    defaultMessage: 'Added database {databaseName}',
    values: { databaseName },
  });
};

export const addDatabaseErrorTitle = i18n.translate(
  'xpack.ingestPipelines.manageProcessors.geoip.addDatabaseErrorTitle',
  {
    defaultMessage: 'Error adding database',
  }
);
