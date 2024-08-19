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

export const deserializeGeoipDatabase = (geoipDatabase: GeoipDatabase) => {
  return {
    name: geoipDatabase.database.name,
  };
};
