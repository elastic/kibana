/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { TimelineTypeLiteral } from '../../../../common/types/timeline';
import { appendSearch } from './helpers';
import { TIMELINES_PATH } from '../../../../common/constants';

export const getTimelinesUrl = (search?: string) => `${TIMELINES_PATH}/${appendSearch(search)}`;

export const getTimelineTabsUrl = (tabName: TimelineTypeLiteral, search?: string) =>
  `${TIMELINES_PATH}/${tabName}${appendSearch(search)}`;

export const getTimelineUrl = (id: string, graphEventId?: string) =>
  `${TIMELINES_PATH}/?timeline=(id:'${id}',isOpen:!t${
    isEmpty(graphEventId) ? ')' : `,graphEventId:'${graphEventId}')`
  }`;
