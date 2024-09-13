/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GeoipDatabase } from '../../../../common/types';

export const ADD_DATABASE_MODAL_TITLE_ID = 'manageProcessorsAddGeoipDatabase';
export const ADD_DATABASE_MODAL_FORM_ID = 'manageProcessorsAddGeoipDatabaseForm';
export const DATABASE_TYPE_OPTIONS = [
  {
    value: 'maxmind',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.maxmindDatabaseType', {
      defaultMessage: 'MaxMind',
    }),
  },
  {
    value: 'ipinfo',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.ipinfoDatabaseType', {
      defaultMessage: 'IPInfo',
    }),
  },
];
export const GEOIP_NAME_OPTIONS = [
  {
    value: 'GeoIP2-Anonymous-IP',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.anonymousIPDatabaseName', {
      defaultMessage: 'GeoIP2 Anonymous IP',
    }),
  },
  {
    value: 'GeoIP2-City',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.cityDatabaseName', {
      defaultMessage: 'GeoIP2 City',
    }),
  },
  {
    value: 'GeoIP2-Connection-Type',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.geoip.connectionTypeDatabaseName',
      {
        defaultMessage: 'GeoIP2 Connection Type',
      }
    ),
  },
  {
    value: 'GeoIP2-Country',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.countryDatabaseName', {
      defaultMessage: 'GeoIP2 Country',
    }),
  },
  {
    value: 'GeoIP2-Domain',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.domainDatabaseName', {
      defaultMessage: 'GeoIP2 Domain',
    }),
  },
  {
    value: 'GeoIP2-Enterprise',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.enterpriseDatabaseName', {
      defaultMessage: 'GeoIP2 Enterprise',
    }),
  },
  {
    value: 'GeoIP2-ISP',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.ispDatabaseName', {
      defaultMessage: 'GeoIP2 ISP',
    }),
  },
];
export const IPINFO_NAME_OPTIONS = [
  {
    value: 'Privacy-Detection',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.ipinfo.privacyDetectionDatabaseName',
      {
        defaultMessage: 'Privacy detection',
      }
    ),
  },
  {
    value: 'IP-Geolocation',
    text: i18n.translate(
      'xpack.ingestPipelines.manageProcessors.ipinfo.ipGeolocationDatabaseName',
      {
        defaultMessage: 'IP geolocation',
      }
    ),
  },
  {
    value: 'ASN',
    text: i18n.translate('xpack.ingestPipelines.manageProcessors.ipinfo.asnDatabaseName', {
      defaultMessage: 'ASN',
    }),
  },
];

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

export const DELETE_DATABASE_MODAL_TITLE_ID = 'manageProcessorsDeleteGeoipDatabase';
export const DELETE_DATABASE_MODAL_FORM_ID = 'manageProcessorsDeleteGeoipDatabaseForm';

export const getDeleteDatabaseSuccessMessage = (databaseName: string): string => {
  return i18n.translate(
    'xpack.ingestPipelines.manageProcessors.geoip.deleteDatabaseSuccessMessage',
    {
      defaultMessage: 'Deleted database {databaseName}',
      values: { databaseName },
    }
  );
};

export const deleteDatabaseErrorTitle = i18n.translate(
  'xpack.ingestPipelines.manageProcessors.geoip.deleteDatabaseErrorTitle',
  {
    defaultMessage: 'Error deleting database',
  }
);

export const getTypeLabel = (type: GeoipDatabase['type']): string => {
  switch (type) {
    case 'maxmind': {
      return i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.typeMaxmindLabel', {
        defaultMessage: 'MaxMind',
      });
    }
    case 'ipinfo': {
      return i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.typeIpinfoLabel', {
        defaultMessage: 'IPInfo',
      });
    }
    case 'unknown':
    default: {
      return i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.typeUnknownLabel', {
        defaultMessage: 'Unknown',
      });
    }
  }
};
