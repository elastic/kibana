/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from 'src/core/public';

let autoFollowPatternUrl: string;
let followerIndexUrl: string;
let byteUnitsUrl: string;
let timeUnitsUrl: string;

export const init = (docLinks: DocLinksStart) => {
  autoFollowPatternUrl = `${docLinks.links.apis.createAutoFollowPattern}`;
  followerIndexUrl = `${docLinks.links.apis.createFollower}`;
  byteUnitsUrl = `${docLinks.links.apis.byteSizeUnits}`;
  timeUnitsUrl = `${docLinks.links.apis.timeUnits}`;
};

export const getAutoFollowPatternUrl = (): string => autoFollowPatternUrl;
export const getFollowerIndexUrl = (): string => followerIndexUrl;
export const getByteUnitsUrl = (): string => byteUnitsUrl;
export const getTimeUnitsUrl = (): string => timeUnitsUrl;
