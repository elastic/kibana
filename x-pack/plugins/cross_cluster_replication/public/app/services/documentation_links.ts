/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let _esBase: string;

export const init = (esBase: string) => {
  _esBase = esBase;
};

export const getAutoFollowPatternUrl = (): string => `${_esBase}/ccr-put-auto-follow-pattern.html`;
export const getFollowerIndexUrl = (): string => `${_esBase}/ccr-put-follow.html`;
export const getByteUnitsUrl = (): string => `${_esBase}/common-options.html#byte-units`;
export const getTimeUnitsUrl = (): string => `${_esBase}/common-options.html#time-units`;
