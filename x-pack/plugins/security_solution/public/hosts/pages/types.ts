/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { ActionCreator } from 'typescript-fsa';

import { hostsModel } from '../store';
import { GlobalTimeArgs } from '../../common/containers/use_global_time';
import { InputsModelId } from '../../common/store/inputs/constants';
import { DocValueFields } from '../../common/containers/source';

export const hostsPagePath = '/';
export const hostDetailsPagePath = `/:detailName`;

export type HostsTabsProps = HostsComponentProps &
  GlobalTimeArgs & {
    docValueFields: DocValueFields[];
    filterQuery: string;
    type: hostsModel.HostsType;
    indexPattern: IIndexPattern;
    setAbsoluteRangeDatePicker: ActionCreator<{
      id: InputsModelId;
      from: string;
      to: string;
    }>;
  };

export type HostsQueryProps = GlobalTimeArgs;

export interface HostsComponentProps {
  hostsPagePath: string;
}
