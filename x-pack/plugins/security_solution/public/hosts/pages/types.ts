/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCreator } from 'typescript-fsa';

import type { Filter } from '@kbn/es-query';
import type { hostsModel } from '../store';
import type { GlobalTimeArgs } from '../../common/containers/use_global_time';
import type { InputsModelId } from '../../common/store/inputs/constants';
import { HOSTS_PATH } from '../../../common/constants';

export const hostDetailsPagePath = `${HOSTS_PATH}/:detailName`;

export type HostsTabsProps = GlobalTimeArgs & {
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
