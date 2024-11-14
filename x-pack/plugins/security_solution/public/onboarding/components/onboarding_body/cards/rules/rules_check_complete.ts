/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { ENABLED_FIELD } from '../../../../../../common';
import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../common/constants';
import type { FetchRulesResponse } from '../../../../../detection_engine/rule_management/logic';

export const checkRulesComplete: OnboardingCardCheckComplete = async ({
  http,
  notifications: { toasts },
}) => {
  // Check if there are any rules installed and enabled
  try {
    const data = await fetchRuleManagementFilters({
      http,
      query: {
        page: 1,
        per_page: 20,
        sort_field: 'enabled',
        sort_order: 'desc',
        filter: `${ENABLED_FIELD}: true`,
      },
    });
    return {
      isComplete: data?.total > 0,
    };
  } catch (e) {
    toasts.addError(e, { title: `Failed to check Card Rules completion.` });

    return {
      isComplete: false,
    };
  }
};

const fetchRuleManagementFilters = async ({
  http,
  signal,
  query,
}: {
  http: HttpSetup;
  signal?: AbortSignal;
  query?: {
    page: number;
    per_page: number;
    sort_field: string;
    sort_order: string;
    filter: string;
  };
}): Promise<FetchRulesResponse> =>
  http.fetch<FetchRulesResponse>(DETECTION_ENGINE_RULES_URL_FIND, {
    method: 'GET',
    version: '2023-10-31',
    signal,
    query,
  });
