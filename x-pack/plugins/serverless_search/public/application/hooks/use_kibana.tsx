/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useKibana as useKibanaBase } from '@kbn/kibana-react-plugin/public';
import { GetUserProfileResponse, UserProfileData } from '@kbn/security-plugin/common';

export interface ServerlessSearchContext {
  cloud: CloudStart;
  userProfile: GetUserProfileResponse<UserProfileData>;
}

type ServerlessSearchKibanaContext = CoreStart & ServerlessSearchContext;

export const useKibanaServices = () => useKibanaBase<ServerlessSearchKibanaContext>().services;
