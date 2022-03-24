/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { SourcererUrlState } from '../../../store/sourcerer/model';
import { TimelineUrl } from '../../../../timelines/store/timeline/model';

import { SecuritySolutionTabNavigationProps } from '../types';
import { SiemRouteType } from '../../../utils/route/types';

export interface TabNavigationProps extends SecuritySolutionTabNavigationProps {
  pathName: string;
  pageName: string;
  tabName: SiemRouteType | undefined;
  [CONSTANTS.appQuery]?: Query;
  [CONSTANTS.filters]?: Filter[];
  [CONSTANTS.savedQuery]?: string;
  [CONSTANTS.sourcerer]: SourcererUrlState;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: TimelineUrl;
}

export interface TabNavigationItemProps {
  hrefWithSearch: string;
  id: string;
  disabled: boolean;
  name: string;
  isSelected: boolean;
}
