/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { SanitizedRule } from '../../common';

/**
 * Returns information that can be used to navigate to a specific page to view the given rule.
 *
 * @param rule The rule to view
 * @returns A URL that is meant to be relative to your application id, or a state object that your application uses to render
 * the rule. This information is intended to be used with cores NavigateToApp function, along with the application id that was
 * originally registered to {@link PluginSetupContract.registerNavigation}.
 *
 */
export type AlertNavigationHandler = (rule: SanitizedRule) => JsonObject | string;
