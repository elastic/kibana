/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { formatNumber } from './number';

const getUnitIndex = (val: number, base: number, labels: string[]) => {
  for (let i = 0; i < labels.length; i++) {
    if (val % Math.pow(base, i) === val) {
      return i - 1;
    }
  }
  return 0;
};
/**
 * The labels are derived from these two Wikipedia articles.
 * https://en.wikipedia.org/wiki/Kilobit
 * https://en.wikipedia.org/wiki/Kilobyte
 */
const LABELS = {
  [InfraWaffleMapDataFormat.bytesDecimal]: ['', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: [
    '',
    'Kib',
    'Mib',
    'Gib',
    'Tib',
    'Pib',
    'Eib',
    'Zib',
    'Yib',
  ],
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: ['', 'KB', 'MB', 'GB'],
  [InfraWaffleMapDataFormat.bitsDecimal]: [
    '',
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
    '',
    'Kibit',
    'Mibit',
    'Gibit',
    'Tibit',
    'Pibit',
    'Eibit',
    'Zibit',
    'Yibit',
  ],
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: ['', 'Kbit', 'Mbit', 'Gbit'],
};

const BASES = {
  [InfraWaffleMapDataFormat.bytesDecimal]: 1000,
  [InfraWaffleMapDataFormat.bytesBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bytesBinaryJEDEC]: 1024,
  [InfraWaffleMapDataFormat.bitsDecimal]: 1000,
  [InfraWaffleMapDataFormat.bitsBinaryIEC]: 1024,
  [InfraWaffleMapDataFormat.bitsBinaryJEDEC]: 1024,
};

export const createDataFormatter = (format: InfraWaffleMapDataFormat) => (val: number) => {
  const labels = LABELS[format];
  const base = BASES[format];
  const unitIndex = getUnitIndex(val, base, labels);
  return `${formatNumber(val / Math.pow(base, unitIndex))} ${labels[unitIndex]}`;
};
