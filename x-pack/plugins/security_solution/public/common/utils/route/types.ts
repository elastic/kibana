/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as H from 'history';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { TimelineType } from '../../../../common/types/timeline';

import { HostsTableType } from '../../../hosts/store/model';
import { NetworkRouteType } from '../../../network/pages/navigation/types';
import { AdministrationSubTab as AdministrationType } from '../../../management/types';
import { FlowTarget } from '../../../../common/search_strategy';

export type SiemRouteType = HostsTableType | NetworkRouteType | TimelineType | AdministrationType;
export interface RouteSpyState {
  pageName: string;
  detailName: string | undefined;
  tabName: SiemRouteType | undefined;
  search: string;
  pathName: string;
  history?: H.History;
  flowTarget?: FlowTarget;
  state?: Record<string, string | undefined>;
}

export interface HostRouteSpyState extends RouteSpyState {
  tabName: HostsTableType | undefined;
}

export interface NetworkRouteSpyState extends RouteSpyState {
  tabName: NetworkRouteType | undefined;
}

export interface TimelineRouteSpyState extends RouteSpyState {
  tabName: TimelineType | undefined;
}

export interface AdministrationRouteSpyState extends RouteSpyState {
  tabName: AdministrationType | undefined;
}

export type RouteSpyAction =
  | {
      type: 'updateSearch';
      search: string;
    }
  | {
      type: 'updateRouteWithOutSearch';
      route: Pick<
        RouteSpyState,
        'pageName' & 'detailName' & 'tabName' & 'pathName' & 'history' & 'state'
      >;
    }
  | {
      type: 'updateRoute';
      route: RouteSpyState;
    };

export interface ManageRoutesSpyProps {
  children: React.ReactNode;
}

export type SpyRouteProps = RouteComponentProps<{
  detailName: string | undefined;
  tabName: HostsTableType | undefined;
  search: string;
  flowTarget: FlowTarget | undefined;
}> & {
  state?: Record<string, string | undefined>;
};
