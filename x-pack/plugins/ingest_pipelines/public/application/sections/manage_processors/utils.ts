/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatabaseType, DatabaseNameOption } from '../../../../common/types';
import { GEOIP_NAME_OPTIONS, IPINFO_NAME_OPTIONS } from './constants';

const getDatabaseNameOptions = (type?: DatabaseType): DatabaseNameOption[] => {
  switch (type) {
    case 'maxmind':
      return GEOIP_NAME_OPTIONS;
    case 'ipinfo':
      return IPINFO_NAME_OPTIONS;
    case undefined:
      return [...GEOIP_NAME_OPTIONS, ...IPINFO_NAME_OPTIONS];
    default:
      return [];
  }
};

/**
 * Returns the value/id of the database, if it exists.
 *
 * @param databaseText The human-readable name of the database
 * @param type If specified, searches only in the database name options for this type
 */
export const getDatabaseValue = (databaseText: string, type?: DatabaseType): string | undefined => {
  const options = getDatabaseNameOptions(type);
  return options.find((opt) => opt.text === databaseText)?.value;
};

/**
 * Returns the human-readable name of the database, if it exists.
 *
 * @param databaseText The id/value of the database
 * @param type If specified, searches only in the database name options for this type
 */
export const getDatabaseText = (databaseValue: string, type?: DatabaseType): string | undefined => {
  const options = getDatabaseNameOptions(type);
  return options.find((opt) => opt.value === databaseValue)?.text;
};
