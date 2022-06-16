/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { TimelineUrl } from '../../../../timelines/store/timeline/model';

import { SecuritySolutionTabNavigationProps } from '../types';
import { SiemRouteType } from '../../../utils/route/types';

export interface TabNavigationProps extends SecuritySolutionTabNavigationProps {
  pathName: string;
  pageName: string;
  tabName: SiemRouteType | undefined;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: TimelineUrl;
}

export interface TabNavigationItemProps {
  hrefWithSearch: string;
  id: string;
  disabled: boolean;
  name: string;
  isSelected: boolean;
  isBeta?: boolean;
}
