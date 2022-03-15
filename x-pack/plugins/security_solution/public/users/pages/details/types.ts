/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionCreator } from 'typescript-fsa';
import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { UsersQueryProps } from '../types';
import { NavTab } from '../../../common/components/navigation/types';

import { DocValueFields } from '../../../common/containers/source';

import { UsersTableType } from '../../store/model';
import { usersModel } from '../../store';

interface UsersDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface UserBodyComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
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

export type KeyUsersDetailsNavTabWithoutMlPermission = UsersTableType.events;

type KeyUsersDetailsNavTabWithMlPermission = KeyUsersDetailsNavTabWithoutMlPermission &
  UsersTableType.anomalies;

type KeyUsersDetailsNavTab =
  | KeyUsersDetailsNavTabWithoutMlPermission
  | KeyUsersDetailsNavTabWithMlPermission;

export type UsersDetailsNavTab = Record<KeyUsersDetailsNavTab, NavTab>;

export type UsersDetailsTabsProps = UserBodyComponentDispatchProps &
  UsersQueryProps & {
    docValueFields?: DocValueFields[];
    indexNames: string[];
    pageFilters?: Filter[];
    filterQuery?: string;
    indexPattern: DataViewBase;
    type: usersModel.UsersType;
  };

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
}>;
