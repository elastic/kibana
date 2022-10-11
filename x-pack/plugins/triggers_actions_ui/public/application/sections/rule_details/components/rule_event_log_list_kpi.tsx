/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiIconTip, EuiStat, EuiSpacer } from '@elastic/eui';
import { IExecutionKPIResult } from '@kbn/alerting-plugin/common';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleEventLogListStatus } from './rule_event_log_list_status';

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

const Stat = ({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip: string;
  children?: JSX.Element;
}) => {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <b>{title}</b>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip} position="top" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {children}
    </EuiPanel>
  );
};

export type RuleEventLogListKPIProps = {
  ruleId: string;
  dateStart: string;
  dateEnd: string;
  outcomeFilter?: string[];
  message?: string;
  refreshToken?: number;
} & Pick<RuleApis, 'loadExecutionKPIAggregations' | 'loadGlobalExecutionKPIAggregations'>;

export const RuleEventLogListKPI = (props: RuleEventLogListKPIProps) => {
  const {
    ruleId,
    dateStart,
    dateEnd,
    outcomeFilter,
    message,
    refreshToken,
    loadExecutionKPIAggregations,
    loadGlobalExecutionKPIAggregations,
  } = props;
  const {
    notifications: { toasts },
  } = useKibana().services;

  const isInitialized = useRef(false);

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
      });
      setKpi(newKpi);
    } catch (e) {
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
  }, [ruleId, dateStart, dateEnd, outcomeFilter, message]);

  useEffect(() => {
    if (isInitialized.current) {
      loadKPIs();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const isLoadingData = useMemo(() => isLoading || !kpi, [isLoading, kpi]);

  const getStatDescription = (element: React.ReactNode) => {
    return (
      <>
        {element}
        <EuiSpacer size="s" />
      </>
    );
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={4}>
        <Stat title="Response" tooltip={RESPONSE_TOOLTIP}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-successOutcome"
                description={getStatDescription(<RuleEventLogListStatus status="success" />)}
                titleSize="s"
                title={kpi?.success ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-unknownOutcome"
                description={getStatDescription(<RuleEventLogListStatus status="unknown" />)}
                titleSize="s"
                title={kpi?.unknown ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-failureOutcome"
                description={getStatDescription(<RuleEventLogListStatus status="failure" />)}
                titleSize="s"
                title={kpi?.failure ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Stat>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <Stat title="Alerts" tooltip={ALERTS_TOOLTIP}>
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
        </Stat>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <Stat title="Actions" tooltip={ACTIONS_TOOLTIP}>
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
        </Stat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleEventLogListKPIWithApi = withBulkRuleOperations(RuleEventLogListKPI);
