/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UrlInputsModel } from '../../../store/inputs/model';
import type { CONSTANTS } from '../../url_state/constants';
import type { TimelineUrl } from '../../../../timelines/store/timeline/model';
import type { SecuritySolutionTabNavigationProps } from '../types';
import type { SiemRouteType } from '../../../utils/route/types';

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
