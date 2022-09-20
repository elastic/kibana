/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiIconTip, EuiStat, EuiSpacer } from '@elastic/eui';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { RuleEventLogListStatus } from './rule_event_log_list_status';

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

  const isInitialized = useRef(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kpi, setKpi] = useState<any>(null);

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
        dateStart,
        dateEnd,
        outcomeFilter,
        message,
      });
      setKpi(newKpi);
    } catch (e) {
      // TODO Add toaster
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

  if (isLoading || !kpi) {
    return <CenterJustifiedSpinner />;
  }

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
        <Stat title="Response" tooltip="Response status of recent rule runs">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription(<RuleEventLogListStatus status="success" />)}
                titleSize="s"
                title={kpi.success}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription(<RuleEventLogListStatus status="unknown" />)}
                titleSize="s"
                title={kpi.unknown}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription(<RuleEventLogListStatus status="failure" />)}
                titleSize="s"
                title={kpi.failure}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Stat>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <Stat title="Alerts" tooltip="Alert status of recent rule runs">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription('Active')}
                titleSize="s"
                title={kpi.activeAlerts}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription('New')}
                titleSize="s"
                title={kpi.newAlerts}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription('Recovered')}
                titleSize="s"
                title={kpi.recoveredAlerts}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Stat>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <Stat title="Actions" tooltip="Action status of recent rule runs">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription('Errored')}
                titleSize="s"
                title={kpi.erroredActions}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                description={getStatDescription('Triggered')}
                titleSize="s"
                title={kpi.triggeredActions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Stat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleEventLogListKPIWithApi = withBulkRuleOperations(RuleEventLogListKPI);
