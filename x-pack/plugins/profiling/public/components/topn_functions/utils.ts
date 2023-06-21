/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function getColorLabel(percent: number) {
  const color = percent < 0 ? 'success' : 'danger';
  const icon = percent < 0 ? 'sortDown' : 'sortUp';
  const isSmallPercent = Math.abs(percent) <= 0.01;
  const label = isSmallPercent ? '<0.01' : Math.abs(percent).toFixed(2) + '%';

  return { color, label, icon: isSmallPercent ? undefined : icon };
}
