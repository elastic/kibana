/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter, Query } from '../../../../../../src/plugins/data/public';
import { HostsTableType } from '../../store/hosts/model';
import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../store/timeline/model';
import { CONSTANTS, UrlStateType } from '../url_state/constants';

export interface SiemNavigationProps {
  display?: 'default' | 'condensed';
  navTabs: Record<string, NavTab>;
}

export interface SiemNavigationComponentProps {
  pathName: string;
  pageName: string;
  tabName: HostsTableType | undefined;
  urlState: {
    [CONSTANTS.appQuery]?: Query;
    [CONSTANTS.filters]?: Filter[];
    [CONSTANTS.savedQuery]?: string;
    [CONSTANTS.timerange]: UrlInputsModel;
    [CONSTANTS.timeline]: TimelineUrl;
  };
}

export type SearchNavTab = NavTab | { urlKey: UrlStateType; isDetailPage: boolean };

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey: UrlStateType;
  isDetailPage?: boolean;
}
