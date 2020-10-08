/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface GeoEcs {
  city_name?: string[];

  continent_name?: string[];

  country_iso_code?: string[];

  country_name?: string[];

  location?: Location;

  region_iso_code?: string[];

  region_name?: string[];
}

export interface Location {
  lon?: number[];

  lat?: number[];
}
