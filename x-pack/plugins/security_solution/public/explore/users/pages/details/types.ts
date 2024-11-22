/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCreator } from 'typescript-fsa';

import { type DataViewSpec } from '@kbn/data-plugin/common';
import type { Filter, Query } from '@kbn/es-query';

import type { UsersQueryProps } from '../types';
import type { NavTab } from '../../../../common/components/navigation/types';

import type { UsersDetailsTableType } from '../../store/model';
import type { usersModel } from '../../store';

interface UsersDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface UserBodyComponentDispatchProps {
  detailName: string;
  usersDetailsPagePath: string;
}

interface UsersDetailsComponentDispatchProps extends UserBodyComponentDispatchProps {
  setUsersDetailsTablesActivePageToZero: ActionCreator<null>;
}

export interface UsersDetailsProps {
  detailName: string;
  usersDetailsPagePath: string;
}

export type UsersDetailsComponentProps = UsersDetailsComponentReduxProps &
  UsersDetailsComponentDispatchProps &
  UsersQueryProps;

type KeyUsersDetailsNavTab = `${UsersDetailsTableType}`;

export type UsersDetailsNavTab = Partial<Record<KeyUsersDetailsNavTab, NavTab>>;

export type UsersDetailsTabsProps = UserBodyComponentDispatchProps &
  UsersQueryProps & {
    indexNames: string[];
    userDetailFilter: Filter[];
    filterQuery?: string;
    dataViewSpec?: DataViewSpec;
    type: usersModel.UsersType;
  };
