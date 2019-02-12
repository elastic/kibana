/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { InfraMetricInput, InfraNodeType, InfraPathInput } from '../../../graphql/types';
import { InfraGroupByOptions } from '../../../lib/lib';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_options');

export const changeMetric = actionCreator<InfraMetricInput>('CHANGE_METRIC');
export const changeGroupBy = actionCreator<InfraPathInput[]>('CHANGE_GROUP_BY');
export const changeCustomOptions = actionCreator<InfraGroupByOptions[]>('CHANGE_CUSTOM_OPTIONS');
export const changeNodeType = actionCreator<InfraNodeType>('CHANGE_NODE_TYPE');
export const changeView = actionCreator<string>('CHANGE_VIEW');
