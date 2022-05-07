/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionCreator } from 'typescript-fsa';

import { Filter } from '@kbn/es-query';
import { hostsModel } from '../store';
import { GlobalTimeArgs } from '../../common/containers/use_global_time';
import { InputsModelId } from '../../common/store/inputs/constants';
import { DocValueFields } from '../../common/containers/source';
import { HOSTS_PATH } from '../../../common/constants';

export const hostDetailsPagePath = `${HOSTS_PATH}/:detailName`;

export type HostsTabsProps = GlobalTimeArgs & {
  docValueFields: DocValueFields[];
  filterQuery: string;
  pageFilters?: Filter[];
  indexNames: string[];
  type: hostsModel.HostsType;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
};

export type HostsQueryProps = GlobalTimeArgs;
