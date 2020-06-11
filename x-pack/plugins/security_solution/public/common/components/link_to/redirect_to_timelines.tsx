/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineTypeLiteral } from '../../../../common/types/timeline';
import { appendSearch } from './helpers';

export const getTimelinesUrl = (search?: string) => `${appendSearch(search)}`;

export const getTimelineTabsUrl = (tabName: TimelineTypeLiteral, search?: string) =>
  `/${tabName}${appendSearch(search)}`;
