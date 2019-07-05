/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
const actionCreator = actionCreatorFactory('x-pack/infra/local/log_flyout');
export const setFlyoutItem = actionCreator<string>('SET_FLYOUT_ITEM');
export const showFlyout = actionCreator('SHOW_FLYOUT');
export const hideFlyout = actionCreator('HIDE_FLYOUT');
