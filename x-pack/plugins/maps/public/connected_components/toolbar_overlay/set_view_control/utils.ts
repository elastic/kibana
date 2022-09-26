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
  	? 
  	  i18n.translate('xpack.maps.setViewControl.outOfRangeErrorMsg', {
        defaultMessage: `Must be between ${min} and ${max}`,
        values: { min, max }
      }) 
  	: null;
  return { isInvalid, error }
}

export function convertDDToUTM(lat: string | number, lon: string | number) {
  try {
    const utmCoord = converter.LLtoUTM(lat, lon);

    let eastwest = 'E';
    if (utmCoord.easting < 0) {
      eastwest = 'W';
    }
    let norwest = 'N';
    if (utmCoord.northing < 0) {
      norwest = 'S';
    }

    if (utmCoord !== 'undefined') {
      utmCoord.zoneLetter = isNaN(lat) ? '' : converter.UTMLetterDesignator(lat);
      utmCoord.zone = `${utmCoord.zoneNumber}${utmCoord.zoneLetter}`;
      utmCoord.easting = Math.round(utmCoord.easting);
      utmCoord.northing = Math.round(utmCoord.northing);
      utmCoord.str = `${utmCoord.zoneNumber}${utmCoord.zoneLetter} ${utmCoord.easting}${eastwest} ${utmCoord.northing}${norwest}`;
    }

    return utmCoord;
  } catch (e) {
    return {
      northing: '',
      easting: '',
      zoneNumber: '',
      zoneLetter: '',
      zone: '',
    };
  }
}

export function ddToMGRS(lat: string | number, lon: string | number) {
  try {
    const mgrsCoord = converter.LLtoMGRS(lat, lon, 5);
    return mgrsCoord;
  } catch (e) {
    return '';
  }
}

export function getViewString(lat: number, lon: number, zoom: number) {
  return `${lat},${lon},${zoom}`;
}

function convertMGRStoUSNG(mgrs: string) {
  let squareIdEastSpace = 0;
  for (let i = mgrs.length - 1; i > -1; i--) {
    // check if we have hit letters yet
    if (isNaN(mgrs.substr(i, 1))) {
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
  return mgrs ? converter.USNGtoLL(convertMGRStoUSNG(mgrs)) : '';
}