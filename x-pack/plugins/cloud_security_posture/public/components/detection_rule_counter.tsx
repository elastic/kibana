/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiSkeletonText, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useFetchDetectionRulesAlertsStatus } from '../common/api/use_fetch_detection_rules_alerts_status';
import { useFetchDetectionRulesByTags } from '../common/api';

const RULES_PAGE_PATH = '/rules/management';

const RULES_TABLE_STATE_STORAGE_KEY = 'securitySolution.rulesTable';

export const DetectionRuleCounter = ({ tags }: { tags: string[] }) => {
  const { data, isLoading } = useFetchDetectionRulesByTags(tags);
  const { data: alertsData, isLoading: alertsIsLoading } = useFetchDetectionRulesAlertsStatus(tags);

  const rulesPagePath = RULES_PAGE_PATH;

  const history = useHistory();

  const [, setRulesTable] = useSessionStorage(RULES_TABLE_STATE_STORAGE_KEY);

  const rulePageNavigation = async () => {
    await setRulesTable({
      tags,
    });
    history.push({
      pathname: rulesPagePath,
    });
  };

  return (
    <EuiSkeletonText lines={1} size="m" isLoading={isLoading || alertsIsLoading}>
      {data?.total === 0 ? (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.csp.findingsFlyout.alerts.alertsDisabled"
            defaultMessage="Disabled"
          />
        </EuiText>
      ) : (
        <>
          <a href="#/detections/rules" data-test-subj="detectionsRulesLink">
            <FormattedMessage
              id="xpack.csp.findingsFlyout.alerts.alertCount"
              defaultMessage="{alertCount, plural, one {# alert} other {# alerts}}"
              values={{ alertCount: alertsData?.total }}
            />
          </a>{' '}
          <FormattedMessage
            id="xpack.csp.findingsFlyout.alerts.detectedBy"
            defaultMessage="detected by"
          />{' '}
          <EuiLink onClick={rulePageNavigation} data-test-subj="detectionsRulesLink">
            <FormattedMessage
              id="xpack.csp.findingsFlyout.alerts.ruleCount"
              defaultMessage="{ruleCount, plural, one {# rule} other {# rules}}"
              values={{ ruleCount: data?.total }}
            />
          </EuiLink>
        </>
      )}
    </EuiSkeletonText>
  );
};
