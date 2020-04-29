/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnMatchPage, wasPreviouslyOnMatchPage } from './is_on_page';

export const isOnPolicyPage = () => isOnMatchPage('/policy');

export const isOnPolicyDetailsPage = () => isOnMatchPage('/policy/:id');

export const wasPreviouslyOnPolicyPage = () => wasPreviouslyOnMatchPage('/policy');

export const wasPreviouslyOnPolicyDetailsPage = () => wasPreviouslyOnMatchPage('/policy/:id');
