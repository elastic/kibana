/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { SiemPageName } from '../../pages/home/types';

import { appendSearch } from './helpers';
import { RedirectWrapper } from './redirect_wrapper';
import { TimelineTypes } from '../../../common/types/timelines';

export type TimelineComponentProps = RouteComponentProps<{
  tabName: 'default' | 'template';
  search: string;
}>;

export const RedirectToTimelinesPage = ({
  match: {
    params: { tabName },
  },
  location: { search },
}: TimelineComponentProps) => (
  <RedirectWrapper to={`/${SiemPageName.timelines}/${tabName}${search}`} />
);

export const getTimelinesUrl = (search?: string) =>
  `#/link-to/${SiemPageName.timelines}/default${appendSearch(search)}`;

export const getTemplateTimelinesUrl = (search?: string) =>
  `#/link-to/${SiemPageName.timelines}/template${appendSearch(search)}`;
