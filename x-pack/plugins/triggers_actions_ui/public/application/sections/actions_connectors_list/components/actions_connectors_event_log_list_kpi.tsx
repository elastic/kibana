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
  ComponentOpts as ConnectorApis,
  withActionOperations,
} from '../../common/components/with_actions_api_operations';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { EventLogListStatus } from '../../common/components/event_log';

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
    defaultMessage: 'The responses for up to 10,000 most recent actions triggered.',
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

export type ConnectorEventLogListKPIProps = {
  ruleId: string;
  dateStart: string;
  dateEnd: string;
  outcomeFilter?: string[];
  message?: string;
  refreshToken?: number;
  namespaces?: Array<string | undefined>;
} & Pick<ConnectorApis, 'loadGlobalExecutionKPIAggregations'>;

export const ConnectorEventLogListKPI = (props: ConnectorEventLogListKPIProps) => {
  const {
    ruleId,
    dateStart,
    dateEnd,
    outcomeFilter,
    message,
    refreshToken,
    namespaces,
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
    return loadGlobalExecutionKPIAggregations;
  }, [loadGlobalExecutionKPIAggregations]);

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
            <EuiFlexItem>
              <EuiStat
                data-test-subj="ruleEventLogKpi-unknownOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="unknown"
                    useExecutionStatus={isRuleUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.unknown ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Stat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ConnectorEventLogListKPIWithApi = withActionOperations(ConnectorEventLogListKPI);
