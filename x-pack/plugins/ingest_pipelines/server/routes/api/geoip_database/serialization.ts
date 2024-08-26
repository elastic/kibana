/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GeoipDatabase {
  id: string;
  version: number;
  modified_date_millis: number;
  database: {
    name: string;
    maxmind: {
      account_id: string;
    };
  };
}

const getGeoipType = ({ database }: GeoipDatabase) => {
  if (database.maxmind && database.maxmind.account_id) {
    return 'maxmind';
  }
  return 'unknown';
};

export const deserializeGeoipDatabase = (geoipDatabase: GeoipDatabase) => {
  const { database, id } = geoipDatabase;
  return {
    name: database.name,
    id,
    type: getGeoipType(geoipDatabase),
  };
};

export const serializeGeoipDatabase = ({
  databaseName,
  maxmind,
}: {
  databaseName: string;
  maxmind: string;
}) => {
  return {
    name: databaseName,
    maxmind: {
      account_id: maxmind,
    },
  };
};
