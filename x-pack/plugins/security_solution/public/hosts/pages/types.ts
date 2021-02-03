/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';

import { hostsModel } from '../store';
import { GlobalTimeArgs } from '../../common/containers/use_global_time';
import { InputsModelId } from '../../common/store/inputs/constants';
import { DocValueFields } from '../../common/containers/source';

export const hostsPagePath = '/';
export const hostDetailsPagePath = `/:detailName`;

export type HostsTabsProps = GlobalTimeArgs & {
  docValueFields: DocValueFields[];
  filterQuery: string;
  indexNames: string[];
  type: hostsModel.HostsType;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
};

export type HostsQueryProps = GlobalTimeArgs;
