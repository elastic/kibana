/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { IExecutionKPIResult } from '@kbn/alerting-plugin/common';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { EventLogListStatus, EventLogStat } from '../../common/components/event_log';
import { RefreshToken } from './types';

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogListKpi.apiError',
  {
    defaultMessage: 'Failed to fetch event log KPI.',
  }
);

const RESPONSE_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogListKpi.responseTooltip',
  {
    defaultMessage: 'The responses for up to 10,000 most recent rule runs.',
  }
);

const ALERTS_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogListKpi.alertsTooltip',
  {
    defaultMessage: 'The alert statuses for up to 10,000 most recent rule runs.',
  }
);

const ACTIONS_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.ruleEventLogListKpi.actionsTooltip',
  {
    defaultMessage: 'The action statuses for up to 10,000 most recent rule runs.',
  }
);

export type RuleEventLogListKPIProps = {
  ruleId: string;
  dateStart: string;
  dateEnd: string;
  outcomeFilter?: string[];
  message?: string;
  refreshToken?: RefreshToken;
  namespaces?: Array<string | undefined>;
  filteredRuleTypes?: string[];
} & Pick<RuleApis, 'loadExecutionKPIAggregations' | 'loadGlobalExecutionKPIAggregations'>;

export const RuleEventLogListKPI = (props: RuleEventLogListKPIProps) => {
  const {
    ruleId,
    dateStart,
    dateEnd,
    outcomeFilter,
    message,
    refreshToken,
    namespaces,
    filteredRuleTypes,
    loadExecutionKPIAggregations,
    loadGlobalExecutionKPIAggregations,
  } = props;
  const {
    notifications: { toasts },
  } = useKibana().services;

  const isInitialized = useRef(false);
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kpi, setKpi] = useState<IExecutionKPIResult>();

  const loadKPIFn = useMemo(() => {
    if (ruleId === '*') {
      return loadGlobalExecutionKPIAggregations;
    }
    return loadExecutionKPIAggregations;
  }, [ruleId, loadExecutionKPIAggregations, loadGlobalExecutionKPIAggregations]);

  const loadKPIs = async () => {
    setIsLoading(true);
    try {
      const newKpi = await loadKPIFn({
        id: ruleId,
        dateStart: getParsedDate(dateStart),
        dateEnd: getParsedDate(dateEnd),
        outcomeFilter,
        message,
        ...(namespaces ? { namespaces } : {}),
        ruleTypeIds: filteredRuleTypes,
      });
      setKpi(newKpi);
    } catch (e) {
      if (e.body.statusCode === 413) {
        return;
      }
      toasts.addDanger({
        title: API_FAILED_MESSAGE,
        text: e.body?.message ?? e,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId, dateStart, dateEnd, outcomeFilter, message, namespaces]);

  useEffect(() => {
    if (isInitialized.current) {
      loadKPIs();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const isLoadingData = useMemo(() => isLoading || !kpi, [isLoading, kpi]);

  const getStatDescription = (element: React.ReactNode) => {
    return <span style={{ paddingBottom: '8px', display: 'flex' }}>{element}</span>;
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={4}>
        <EventLogStat title="Responses" tooltip={RESPONSE_TOOLTIP}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-successOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="success"
                    useExecutionStatus={isRuleUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.success ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-warningOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="warning"
                    useExecutionStatus={isRuleUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.warning ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-failureOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="failure"
                    useExecutionStatus={isRuleUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.failure ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EventLogStat>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <EventLogStat title="Alerts" tooltip={ALERTS_TOOLTIP}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-activeAlerts"
                description={getStatDescription('Active')}
                titleSize="s"
                title={kpi?.activeAlerts ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-newAlerts"
                description={getStatDescription('New')}
                titleSize="s"
                title={kpi?.newAlerts ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-recoveredAlerts"
                description={getStatDescription('Recovered')}
                titleSize="s"
                title={kpi?.recoveredAlerts ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EventLogStat>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EventLogStat title="Actions" tooltip={ACTIONS_TOOLTIP}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-erroredActions"
                description={getStatDescription('Errored')}
                titleSize="s"
                title={kpi?.erroredActions ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-triggeredActions"
                description={getStatDescription('Triggered')}
                titleSize="s"
                title={kpi?.triggeredActions ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EventLogStat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleEventLogListKPIWithApi = withBulkRuleOperations(RuleEventLogListKPI);
