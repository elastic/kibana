/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ManagedUserHits,
  ManagedUserFields,
} from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { ManagedUserDatasetKey } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import type { ManagedUserData } from '../types';

const userRiskScore = {
  '@timestamp': '123456',
  user: {
    name: 'test',
    risk: {
      rule_risks: [],
      calculated_score_norm: 70,
      multipliers: [],
      calculated_level: RiskSeverity.high,
    },
  },
  alertsCount: 0,
  oldestAlertTimestamp: '123456',
};

export const mockRiskScoreState = {
  data: [userRiskScore],
  inspect: {
    dsl: [],
    response: [],
  },
  isInspected: false,
  refetch: () => {},
  totalCount: 0,
  isModuleEnabled: true,
  isAuthorized: true,
  isDeprecated: false,
  loading: false,
  error: undefined,
};

export const mockOktaUserFields: ManagedUserFields = {
  '@timestamp': ['2023-11-16T13:42:23.074Z'],
  'event.dataset': [ManagedUserDatasetKey.OKTA],
  'user.profile.last_name': ['Okta last name'],
  'user.profile.first_name': ['Okta first name'],
  'user.profile.mobile_phone': ['1234567'],
  'user.profile.job_title': ['Okta Unit tester'],
  'user.geo.city_name': ["A'dam"],
  'user.geo.country_iso_code': ['NL'],
  'user.id': ['00ud9ohoh9ww644Px5d7'],
  'user.email': ['okta.test.user@elastic.co'],
  'user.name': ['okta.test.user@elastic.co'],
};

export const mockEntraUserFields: ManagedUserFields = {
  '@timestamp': ['2023-11-16T13:42:23.074Z'],
  'event.dataset': [ManagedUserDatasetKey.ENTRA],
  'user.id': ['12345'],
  'user.first_name': ['Entra first name'],
  'user.last_name': ['Entra last name'],
  'user.full_name': ['Entra full name'],
  'user.phone': ['123456'],
  'user.job_title': ['Entra Unit tester'],
  'user.work.location_name': ['USA, CA'],
};

export const managedUserDetails: ManagedUserHits = {
  [ManagedUserDatasetKey.ENTRA]: {
    fields: mockEntraUserFields,
    _index: 'test-index',
    _id: '123-test',
  },
};

export const mockManagedUserData: ManagedUserData = {
  data: managedUserDetails,
  isLoading: false,
  isIntegrationEnabled: true,
};
