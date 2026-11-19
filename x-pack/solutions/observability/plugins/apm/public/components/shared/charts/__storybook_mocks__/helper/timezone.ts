/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';

interface Params {
  domain: [number, number];
  totalTicks: number;
  width: number;
}

export const getTimeTicksTZ = ({ domain, totalTicks }: Params) => {
  const [start, end] = domain;
  const step = (end - start) / totalTicks;
  return Array.from({ length: totalTicks }, (_, i) => new Date(start + step * i));
};

export const getDomainTZ = (min: number, max: number): [number, number] => [min, max];

export function getTimeZone(uiSettings?: IUiSettingsClient) {
  return 'local';
}
