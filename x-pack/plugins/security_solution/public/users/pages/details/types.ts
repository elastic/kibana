/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCreator } from 'typescript-fsa';
import type { DataViewBase, Filter } from '@kbn/es-query';
import type { InputsModelId } from '../../../common/store/inputs/constants';
import type { UsersQueryProps } from '../types';
import type { NavTab } from '../../../common/components/navigation/types';

import type { UsersTableType } from '../../store/model';
import type { usersModel } from '../../store';

interface UserBodyComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  detailName: string;
  usersDetailsPagePath: string;
}

export interface UsersDetailsProps {
  detailName: string;
  usersDetailsPagePath: string;
}

export type KeyUsersDetailsNavTabWithoutMlPermission = UsersTableType.events &
  UsersTableType.alerts;

type KeyUsersDetailsNavTabWithMlPermission = KeyUsersDetailsNavTabWithoutMlPermission &
  UsersTableType.anomalies;

type KeyUsersDetailsNavTab =
  | KeyUsersDetailsNavTabWithoutMlPermission
  | KeyUsersDetailsNavTabWithMlPermission;

export type UsersDetailsNavTab = Record<KeyUsersDetailsNavTab, NavTab>;

export type UsersDetailsTabsProps = UserBodyComponentDispatchProps &
  UsersQueryProps & {
    indexNames: string[];
    pageFilters?: Filter[];
    filterQuery?: string;
    indexPattern: DataViewBase;
    type: usersModel.UsersType;
  };
