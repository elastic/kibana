/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GeoipDatabaseFromES {
  id: string;
  version: number;
  modified_date_millis: number;
  database: {
    name: string;
    // maxmind type
    maxmind?: {
      account_id: string;
    };
    // ipinfo type
    ipinfo?: {};
  };
}

interface SerializedGeoipDatabase {
  name: string;
  ipinfo?: {};
  maxmind?: {
    account_id: string;
  };
}

const getGeoipType = ({ database }: GeoipDatabaseFromES) => {
  if (database.maxmind && database.maxmind.account_id) {
    return 'maxmind';
  }
  if (database.ipinfo) {
    return 'maxmind';
  }
  return 'unknown';
};

export const deserializeGeoipDatabase = (geoipDatabase: GeoipDatabaseFromES) => {
  const { database, id } = geoipDatabase;
  return {
    name: database.name,
    id,
    type: getGeoipType(geoipDatabase),
  };
};

export const serializeGeoipDatabase = ({
  databaseType,
  databaseName,
  maxmind,
}: {
  databaseType: 'maxmind' | 'ipinfo';
  databaseName: string;
  maxmind?: string;
}): SerializedGeoipDatabase => {
  const database = { name: databaseName } as SerializedGeoipDatabase;
  if (databaseType === 'maxmind') {
    database.maxmind = { account_id: maxmind ?? '' };
  }
  if (databaseType === 'ipinfo') {
    database.ipinfo = {};
  }
  return database;
};
