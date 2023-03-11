/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as H from 'history';
import type React from 'react';

import type { AllRulesTabs } from '../../../detection_engine/rule_management_ui/components/rules_table/rules_table_toolbar';
import type { HostsTableType } from '../../../explore/hosts/store/model';
import type { NetworkRouteType } from '../../../explore/network/pages/navigation/types';
import type { AlertDetailRouteType } from '../../../detections/pages/alert_details/types';
import type { AdministrationSubTab as AdministrationType } from '../../../management/types';
import type { FlowTarget } from '../../../../common/search_strategy';
import type { UsersTableType } from '../../../explore/users/store/model';
import type { SecurityPageName } from '../../../app/types';

interface GenericRouteSpyState<Page = string, Tabs = string> {
  pageName: Page;
  detailName: string | undefined;
  tabName?: Tabs;
  search: string;
  pathName: string;
  history?: H.History;
  flowTarget?: FlowTarget;
  state?: Record<string, string | undefined>;
}

export type RouteSpyState =
  | GenericRouteSpyState<SecurityPageName.hosts, HostsTableType>
  | GenericRouteSpyState<SecurityPageName.users, UsersTableType>
  | GenericRouteSpyState<SecurityPageName.network, NetworkRouteType>
  | GenericRouteSpyState<SecurityPageName.alerts, AlertDetailRouteType>
  | GenericRouteSpyState<SecurityPageName.administration, AdministrationType>
  | GenericRouteSpyState<SecurityPageName.rules, AllRulesTabs>
  | GenericRouteSpyState<
      Exclude<
        SecurityPageName,
        | SecurityPageName.hosts
        | SecurityPageName.users
        | SecurityPageName.network
        | SecurityPageName.alerts
        | SecurityPageName.administration
        | SecurityPageName.rules
      >,
      never
    >;

export type HostRouteSpyState = GenericRouteSpyState<SecurityPageName.hosts, HostsTableType>;
export type UsersRouteSpyState = GenericRouteSpyState<SecurityPageName.users, UsersTableType>;
export type NetworkRouteSpyState = GenericRouteSpyState<SecurityPageName.network, NetworkRouteType>;
export type AlertDetailRouteSpyState = GenericRouteSpyState<
  SecurityPageName.alerts,
  AlertDetailRouteType
>;
export type AdministrationRouteSpyState = GenericRouteSpyState<
  SecurityPageName.administration,
  AdministrationType
>;

export type RouteSpyAction =
  | {
      type: 'updateSearch';
      search: string;
    }
  | {
      type: 'updateRouteWithOutSearch';
      route: Omit<RouteSpyState, 'search'>;
    }
  | {
      type: 'updateRoute';
      route: RouteSpyState;
    };

export interface ManageRoutesSpyProps {
  children: React.ReactNode;
}
