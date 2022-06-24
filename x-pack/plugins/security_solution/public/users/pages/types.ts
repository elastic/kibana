/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActionCreator } from 'typescript-fsa';

import { Filter } from '@kbn/es-query';
import { DocValueFields } from '@kbn/timelines-plugin/common';
import { GlobalTimeArgs } from '../../common/containers/use_global_time';

import { usersModel } from '../store';
import { InputsModelId } from '../../common/store/inputs/constants';

export type UsersTabsProps = GlobalTimeArgs & {
  docValueFields: DocValueFields[];
  filterQuery: string;
  pageFilters?: Filter[];
  indexNames: string[];
  type: usersModel.UsersType;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
};

export type UsersQueryProps = GlobalTimeArgs;
