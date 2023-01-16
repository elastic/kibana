/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as H from 'history';
import type React from 'react';
import type { RouteComponentProps } from 'react-router-dom';

import type { TimelineType } from '../../../../common/types/timeline';

import type { HostsTableType } from '../../../explore/hosts/store/model';
import type { NetworkRouteType } from '../../../explore/network/pages/navigation/types';
import type { AlertDetailRouteType } from '../../../detections/pages/alert_details/types';
import type { AdministrationSubTab as AdministrationType } from '../../../management/types';
import type { FlowTarget } from '../../../../common/search_strategy';
import type { UsersTableType } from '../../../explore/users/store/model';
import type { SecurityPageName } from '../../../app/types';

export type SiemRouteType =
  | HostsTableType
  | NetworkRouteType
  | AlertDetailRouteType
  | TimelineType
  | AdministrationType
  | UsersTableType;
export interface RouteSpyState {
  pageName: SecurityPageName;
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

export interface UsersRouteSpyState extends RouteSpyState {
  tabName: UsersTableType | undefined;
}

export interface NetworkRouteSpyState extends RouteSpyState {
  tabName: NetworkRouteType | undefined;
}

export interface AlertDetailRouteSpyState extends RouteSpyState {
  tabName: AlertDetailRouteType | undefined;
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
