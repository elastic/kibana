/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { formatNumber } from './number';

/**
 * The labels are derived from these two Wikipedia articles.
 * https://en.wikipedia.org/wiki/Kilobit
 * https://en.wikipedia.org/wiki/Kilobyte
 */
const LABELS = {
  [InfraWaffleMapDataFormat.bytesDecimal]: ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: [
    'b',
    'Kib',
    'Mib',
    'Gib',
    'Tib',
    'Pib',
    'Eib',
    'Zib',
    'Yib',
  ],
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: ['B', 'KB', 'MB', 'GB'],
  [InfraWaffleMapDataFormat.bitsDecimal]: [
    'bit',
    'kbit',
    'Mbit',
    'Gbit',
    'Tbit',
    'Pbit',
    'Ebit',
    'Zbit',
    'Ybit',
  ],
  [InfraWaffleMapDataFormat.bitsBinaryIEC]: [
    'bit',
    'Kibit',
    'Mibit',
    'Gibit',
    'Tibit',
    'Pibit',
    'Eibit',
    'Zibit',
    'Yibit',
  ],
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: ['bit', 'Kbit', 'Mbit', 'Gbit'],
  [InfraWaffleMapDataFormat.abbreviatedNumber]: ['', 'K', 'M', 'B', 'T'],
};

const BASES = {
  [InfraWaffleMapDataFormat.bytesDecimal]: 1000,
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: 1024,
  [InfraWaffleMapDataFormat.bitsDecimal]: 1000,
  [InfraWaffleMapDataFormat.bitsBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: 1024,
  [InfraWaffleMapDataFormat.abbreviatedNumber]: 1000,
};

export const createDataFormatter = (format: InfraWaffleMapDataFormat) => (val: number) => {
  const labels = LABELS[format];
  const base = BASES[format];
  const power = Math.min(Math.floor(Math.log(Math.abs(val)) / Math.log(base)), labels.length - 1);
  if (power < 0) {
    return `${formatNumber(val)}${labels[0]}`;
  }
  return `${formatNumber(val / Math.pow(base, power))}${labels[power]}`;
};
