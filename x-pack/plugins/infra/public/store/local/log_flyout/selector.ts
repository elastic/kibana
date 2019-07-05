/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlyoutOptionsState } from './reducer';

export const selectFlyoutId = (state: FlyoutOptionsState) => state.itemId;
export const selectFlyoutVisibility = (state: FlyoutOptionsState) => state.visibility;
