/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { State } from '../../common/store/types';

import { UebaDetailsModel, UebaPageModel, UebaTableType } from './model';

const selectUebaPage = (state: State): UebaPageModel => state.ueba.page;
const selectUebaDetailsPage = (state: State): UebaDetailsModel => state.ueba.details;

export const riskScoreSelector = () =>
  createSelector(selectUebaPage, (ueba) => ueba.queries[UebaTableType.riskScore]);

export const hostRulesSelector = () =>
  createSelector(selectUebaDetailsPage, (ueba) => ueba.queries[UebaTableType.hostRules]);

export const hostTacticsSelector = () =>
  createSelector(selectUebaDetailsPage, (ueba) => ueba.queries[UebaTableType.hostTactics]);

export const userRulesSelector = () =>
  createSelector(selectUebaDetailsPage, (ueba) => ueba.queries[UebaTableType.userRules]);
