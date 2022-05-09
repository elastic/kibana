/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorOptions, RuleTypeParams } from '../../types';
import { ActionContext } from './action_context';
import { EsQueryAlertParams, EsQueryAlertState } from './alert_type_params';
import { ActionGroupId } from './constants';

export type OnlyEsQueryAlertParams = Omit<EsQueryAlertParams, 'searchConfiguration' | 'searchType'>;

export type OnlySearchSourceAlertParams = Omit<
  EsQueryAlertParams,
  'esQuery' | 'index' | 'timeField'
> & {
  searchType: 'searchSource';
};

export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<
  P,
  EsQueryAlertState,
  {},
  ActionContext,
  typeof ActionGroupId
>;
