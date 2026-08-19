/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function combineServiceGroupKueries(serviceGroups: Array<{ kuery: string }>): string {
  return serviceGroups.flatMap((sg): string[] => (sg.kuery ? [`(${sg.kuery})`] : [])).join(' OR ');
}
