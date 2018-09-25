/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { InfraMetricInput } from '../../../../common/graphql/types';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_metrics');

export const changeMetrics = actionCreator<InfraMetricInput[]>('CHANGE_METRICS');
