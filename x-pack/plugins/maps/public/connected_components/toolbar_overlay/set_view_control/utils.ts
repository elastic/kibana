/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as usng from 'usng.js';

// @ts-ignore
const converter = new usng.Converter();

export function withinRange(value: string | number, min: number, max: number) {
  const isInvalid = value === '' || value > max || value < min;
  const error = isInvalid
    ? i18n.translate('xpack.maps.setViewControl.outOfRangeErrorMsg', {
        defaultMessage: `Must be between {min} and {max}`,
        values: { min, max },
      })
    : null;
  return { isInvalid, error };
}

export function ddToUTM(lat: number, lon: number) {
  try {
    const utm = converter.LLtoUTM(lat, lon);
    return {
      northing: utm === converter.UNDEFINED_STR ? '' : String(Math.round(utm.northing)),
      easting: utm === converter.UNDEFINED_STR ? '' : String(Math.round(utm.easting)),
      zone:
        utm === converter.UNDEFINED_STR
          ? ''
          : `${utm.zoneNumber}${converter.UTMLetterDesignator(lat)}`,
    };
  } catch (e) {
    return {
      northing: '',
      easting: '',
      zone: '',
    };
  }
}

export function utmToDD(northing: string, easting: string, zoneNumber: string) {
  try {
    return converter.UTMtoLL(northing, easting, zoneNumber);
  } catch (e) {
    return undefined;
  }
}

export function ddToMGRS(lat: number, lon: number) {
  try {
    const mgrsCoord = converter.LLtoMGRS(lat, lon, 5);
    return mgrsCoord;
  } catch (e) {
    return '';
  }
}

function mgrstoUSNG(mgrs: string) {
  let squareIdEastSpace = 0;
  for (let i = mgrs.length - 1; i > -1; i--) {
    // check if we have hit letters yet
    if (isNaN(parseInt(mgrs.substr(i, 1), 10))) {
      squareIdEastSpace = i + 1;
      break;
    }
  }
  const gridZoneSquareIdSpace = squareIdEastSpace ? squareIdEastSpace - 2 : -1;
  const numPartLength = mgrs.substr(squareIdEastSpace).length / 2;
  // add the number split space
  const eastNorthSpace = squareIdEastSpace ? squareIdEastSpace + numPartLength : -1;
  const stringArray = mgrs.split('');

  stringArray.splice(eastNorthSpace, 0, ' ');
  stringArray.splice(squareIdEastSpace, 0, ' ');
  stringArray.splice(gridZoneSquareIdSpace, 0, ' ');

  const rejoinedArray = stringArray.join('');
  return rejoinedArray;
}

export function mgrsToDD(mgrs: string) {
  try {
    return converter.USNGtoLL(mgrstoUSNG(mgrs));
  } catch (e) {
    return undefined;
  }
}
