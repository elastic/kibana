/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isOnPage,
  isOnDetailsPage,
  wasPreviouslyOnPage,
  wasPreviouslyOnDetailsPage,
} from './is_on_page';

export const isOnPolicyPage = () => isOnPage('/policy');

export const isOnPolicyDetailsPage = () => isOnDetailsPage('/policy');

export const wasPreviouslyOnPolicyPage = () => wasPreviouslyOnPage('/policy');

export const wasPreviouslyOnPolicyDetailsPage = () => wasPreviouslyOnDetailsPage('/policy');
