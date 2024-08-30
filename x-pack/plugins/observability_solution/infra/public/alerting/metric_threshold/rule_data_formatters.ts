/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '@kbn/observability-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import type { AssetDetailsLocatorParams } from '@kbn/observability-shared-plugin/common';
import { castArray } from 'lodash';
import { METRICS_EXPLORER_URL } from '../../../common/constants';
import { getMetricsViewInAppUrl } from '../../../common/alerting/metrics/alert_link';

export const getRuleFormat = ({
  assetDetailsLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
}): ObservabilityRuleTypeFormatter => {
  return ({ fields }) => {
    const reason = fields[ALERT_REASON] ?? '-';
    const parameters = fields[ALERT_RULE_PARAMETERS];

    const link = getMetricsViewInAppUrl({
      fields,
      groupBy: castArray<string>(parameters?.groupBy as string[] | string),
      assetDetailsLocator,
    });

    return {
      reason,
      link,
      hasBasePath: link !== METRICS_EXPLORER_URL,
    };
  };
};
