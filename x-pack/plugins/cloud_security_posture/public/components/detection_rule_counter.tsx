/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiLoadingSpinner, EuiSkeletonText, EuiText } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { useHistory } from 'react-router-dom';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchDetectionRulesAlertsStatus } from '../common/api/use_fetch_detection_rules_alerts_status';
import { useFetchDetectionRulesByTags } from '../common/api/use_fetch_detection_rules_by_tags';
import { RuleResponse } from '../common/types';
import { useKibana } from '../common/hooks/use_kibana';
import { showCreateDetectionRuleSuccessToast } from './take_action';
import { DETECTION_ENGINE_ALERTS_KEY, DETECTION_ENGINE_RULES_KEY } from '../common/constants';

const RULES_PAGE_PATH = '/rules/management';
const ALERTS_PAGE_PATH = '/alerts';

const RULES_TABLE_SESSION_STORAGE_KEY = 'securitySolution.rulesTable';

interface DetectionRuleCounterProps {
  tags: string[];
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
}

export const DetectionRuleCounter = ({ tags, createRuleFn }: DetectionRuleCounterProps) => {
  const { data: rulesData, isLoading: ruleIsLoading } = useFetchDetectionRulesByTags(tags);
  const { data: alertsData, isLoading: alertsIsLoading } = useFetchDetectionRulesAlertsStatus(tags);

  const [isCreateRuleLoading, setIsCreateRuleLoading] = useState(false);

  const queryClient = useQueryClient();
  const { http, notifications } = useKibana().services;

  const history = useHistory();

  const [, setRulesTable] = useSessionStorage(RULES_TABLE_SESSION_STORAGE_KEY);

  const rulePageNavigation = useCallback(async () => {
    await setRulesTable({
      tags,
    });
    history.push({
      pathname: RULES_PAGE_PATH,
    });
  }, [history, setRulesTable, tags]);

  const alertsPageNavigation = useCallback(() => {
    history.push({
      pathname: ALERTS_PAGE_PATH,
    });
  }, [history]);

  const createDetectionRuleOnClick = useCallback(async () => {
    setIsCreateRuleLoading(true);
    const ruleResponse = await createRuleFn(http);
    setIsCreateRuleLoading(false);
    showCreateDetectionRuleSuccessToast(notifications, http, ruleResponse);
    // Triggering a refetch of rules and alerts to update the UI
    queryClient.invalidateQueries([DETECTION_ENGINE_RULES_KEY]);
    queryClient.invalidateQueries([DETECTION_ENGINE_ALERTS_KEY]);
  }, [createRuleFn, http, notifications, queryClient]);

  return (
    <EuiSkeletonText
      data-test-subj="csp:detection-rule-counter-loading"
      lines={1}
      size="m"
      isLoading={ruleIsLoading || alertsIsLoading}
    >
      {rulesData?.total === 0 ? (
        <>
          <EuiText size="s">
            {isCreateRuleLoading ? (
              <>
                <FormattedMessage
                  id="xpack.csp.findingsFlyout.alerts.creatingRule"
                  defaultMessage="Creating detection rule"
                />{' '}
                <EuiLoadingSpinner
                  size="s"
                  data-test-subj="csp:findings-flyout-detection-rule-counter-loading"
                />
              </>
            ) : (
              <>
                <EuiLink
                  onClick={createDetectionRuleOnClick}
                  data-test-subj="csp:findings-flyout-create-detection-rule-link"
                >
                  <FormattedMessage
                    id="xpack.csp.findingsFlyout.alerts.createRuleAction"
                    defaultMessage="Create a detection rule"
                  />
                </EuiLink>{' '}
                <FormattedMessage
                  id="xpack.csp.findingsFlyout.alerts.createRuleDescription"
                  defaultMessage="to generate alerts."
                />
              </>
            )}
          </EuiText>
        </>
      ) : (
        <>
          <EuiLink onClick={alertsPageNavigation} data-test-subj="csp:findings-flyout-alert-count">
            <FormattedMessage
              id="xpack.csp.findingsFlyout.alerts.alertCount"
              defaultMessage="{alertCount, plural, one {# alert} other {# alerts}}"
              values={{ alertCount: alertsData?.total || 0 }}
            />
          </EuiLink>{' '}
          <FormattedMessage
            id="xpack.csp.findingsFlyout.alerts.detectedBy"
            defaultMessage="detected by"
          />{' '}
          <EuiLink
            onClick={rulePageNavigation}
            data-test-subj="csp:findings-flyout-detection-rule-count"
          >
            <FormattedMessage
              id="xpack.csp.findingsFlyout.alerts.detectionRuleCount"
              defaultMessage="{ruleCount, plural, one {# detection rule} other {# detection rules}}"
              values={{ ruleCount: rulesData?.total || 0 }}
            />
          </EuiLink>
        </>
      )}
    </EuiSkeletonText>
  );
};
