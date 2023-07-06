/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const popupVersions: Array<[string, string]> = [
  ['malware', '7.11+'],
  ['ransomware', '7.12+'],
  ['memory_protection', '7.15+'],
  ['behavior_protection', '7.15+'],
];

// FIXME:PT should be deleted. No need to be public outside of hte User Notify component
export const popupVersionsMap: ReadonlyMap<string, string> = new Map<string, string>(popupVersions);
