/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsEnhancedBaseActionFactoryContext } from '../../../../../ui_actions_enhanced/public';
import { APPLY_FILTER_TRIGGER } from '../../../../../../../src/plugins/ui_actions/public';
import { DrilldownConfig } from '../../../../common';

export type Config = DrilldownConfig;

export type FactoryContext = UiActionsEnhancedBaseActionFactoryContext<typeof APPLY_FILTER_TRIGGER>;
