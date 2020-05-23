/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { ActionCreator } from 'typescript-fsa';

import { SiemPageName } from '../home/types';
import { hostsModel } from '../../store';
import { GlobalTimeArgs } from '../../containers/global_time';
import { InputsModelId } from '../../store/inputs/constants';

export const hostsPagePath = `/:pageName(${SiemPageName.hosts})`;
export const hostDetailsPagePath = `${hostsPagePath}/:detailName`;

export type HostsTabsProps = HostsComponentProps & {
  filterQuery: string;
  type: hostsModel.HostsType;
  indexPattern: IIndexPattern;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
};

export type HostsQueryProps = GlobalTimeArgs;

export type HostsComponentProps = HostsQueryProps & { hostsPagePath: string };
