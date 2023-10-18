/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';

import { APP_ID } from '../../../common/constants';

const originalCasesUiCapabilities = createCasesUICapabilities();
const originalCasesApiTags = getCasesApiTags(APP_ID);

export const casesUiCapabilities = {
  ...originalCasesUiCapabilities,
  all: originalCasesUiCapabilities.all.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  ),
  read: originalCasesUiCapabilities.read.filter(
    (capability) => capability !== CASES_CONNECTORS_CAPABILITY
  ),
};

export const casesApiTags = {
  ...originalCasesApiTags,
  all: originalCasesApiTags.all.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  ),
  read: originalCasesApiTags.read.filter(
    (capability) => capability !== GET_CONNECTORS_CONFIGURE_API_TAG
  ),
};
