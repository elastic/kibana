/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useFetchPrebuiltRulesInstallReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import type { ReviewRuleInstallationResponseBody } from '../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param options - react-query options
 * @returns useQuery result
 */
export const usePrebuiltRulesInstallReview = (
  options?: UseQueryOptions<ReviewRuleInstallationResponseBody, Error>
) => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesInstallReviewQuery({
    onError: (error: Error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
    ...options,
  });
};
