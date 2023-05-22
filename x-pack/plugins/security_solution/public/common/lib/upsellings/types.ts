/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../../../common';

export type UpsellingPages = Partial<Record<SecurityPageName, React.ComponentType>>;
export type UpsellingSections = Partial<Record<UpsellingSectionId, React.ComponentType>>;

export type UpsellingSectionId = 'rules_load_prepackaged_tooltip' | 'rules_response_actions';
