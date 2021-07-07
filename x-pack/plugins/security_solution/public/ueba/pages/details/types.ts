/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionCreator } from 'typescript-fsa';
import { Query, IIndexPattern, Filter } from 'src/plugins/data/public';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { UebaTableType } from '../../store/model';
import { UebaQueryProps } from '../types';
import { NavTab } from '../../../common/components/navigation/types';
import { uebaModel } from '../../store';
import { DocValueFields } from '../../../common/containers/source';

interface UebaDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface HostBodyComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  detailName: string;
  uebaDetailsPagePath: string;
}

interface UebaDetailsComponentDispatchProps extends HostBodyComponentDispatchProps {
  setUebaDetailsTablesActivePageToZero: ActionCreator<null>;
}

export interface UebaDetailsProps {
  detailName: string;
  uebaDetailsPagePath: string;
}

export type UebaDetailsComponentProps = UebaDetailsComponentReduxProps &
  UebaDetailsComponentDispatchProps &
  UebaQueryProps;

type KeyUebaDetailsNavTab = UebaTableType.hostRules &
  UebaTableType.hostTactics &
  UebaTableType.userRules;

export type UebaDetailsNavTab = Record<KeyUebaDetailsNavTab, NavTab>;

export type UebaDetailsTabsProps = HostBodyComponentDispatchProps &
  UebaQueryProps & {
    docValueFields?: DocValueFields[];
    indexNames: string[];
    pageFilters?: Filter[];
    filterQuery?: string;
    indexPattern: IIndexPattern;
    type: uebaModel.UebaType;
  };

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
}>;
