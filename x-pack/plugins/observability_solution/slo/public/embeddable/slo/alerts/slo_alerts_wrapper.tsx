/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { Subject } from 'rxjs';
import styled from 'styled-components';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { FetchContext } from '@kbn/presentation-publishing';
import { SloIncludedCount } from './components/slo_included_count';
import { SloAlertsSummary } from './components/slo_alerts_summary';
import { SloAlertsTable } from './components/slo_alerts_table';
import type { SloItem, SloEmbeddableDeps } from './types';
import { EDIT_SLO_ALERTS_ACTION } from '../../../ui_actions/edit_slo_alerts_panel';

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  embeddable: any;
  onRenderComplete?: () => void;
  reloadSubject: Subject<FetchContext>;
  showAllGroupByInstances?: boolean;
}

export function SloAlertsWrapper({
  embeddable,
  slos,
  deps,
  timeRange: initialTimeRange,
  onRenderComplete,
  reloadSubject,
  showAllGroupByInstances,
}: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = deps;

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    const subs = reloadSubject?.subscribe((input) => {
      if (input) {
        const { timeRange: nTimeRange } = input;
        if (nTimeRange && (nTimeRange.from !== timeRange.from || nTimeRange.to !== timeRange.to)) {
          setTimeRange(nTimeRange);
        }
      }
      setLastRefreshTime(Date.now());
    });
    return () => {
      subs?.unsubscribe();
    };
  }, [reloadSubject, timeRange.from, timeRange.to]);

  useEffect(() => {
    setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  const [isSummaryLoaded, setIsSummaryLoaded] = useState(false);
  const [isTableLoaded, setIsTableLoaded] = useState(false);
  useEffect(() => {
    if (isSummaryLoaded && isTableLoaded && onRenderComplete) {
      onRenderComplete();
    }
  }, [isSummaryLoaded, isTableLoaded, onRenderComplete]);
  const handleGoToAlertsClick = () => {
    let kuery = '';
    slos.map((slo, index) => {
      const shouldAddOr = index < slos.length - 1;
      kuery += `(slo.id:"${slo.id}" and slo.instanceId:"${slo.instanceId}")`;
      if (shouldAddOr) {
        kuery += ' or ';
      }
    });
    navigateToUrl(
      `${basePath.prepend(observabilityPaths.alerts)}?_a=(kuery:'${kuery}',rangeFrom:${
        timeRange.from
      },rangeTo:${timeRange.to})`
    );
  };
  return (
    <Wrapper>
      <EuiFlexGroup
        data-shared-item=""
        justifyContent="flexEnd"
        wrap
        css={`
          margin: 0 35px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => {
              const trigger = deps.uiActions.getTrigger(CONTEXT_MENU_TRIGGER);
              deps.uiActions.getAction(EDIT_SLO_ALERTS_ACTION).execute({
                trigger,
                embeddable,
              } as ActionExecutionContext);
            }}
            data-test-subj="o11ySloAlertsWrapperSlOsIncludedLink"
          >
            {showAllGroupByInstances ? (
              <SloIncludedCount slos={slos} />
            ) : (
              i18n.translate('xpack.slo.sloAlertsWrapper.sLOsIncludedFlexItemLabel', {
                defaultMessage:
                  '{numOfSlos, number} {numOfSlos, plural, one {SLO} other {SLOs}} included',
                values: {
                  numOfSlos: slos.length,
                },
              })
            )}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="o11ySloAlertsWrapperGoToAlertsLink"
            onClick={handleGoToAlertsClick}
          >
            <FormattedMessage
              id="xpack.slo.sloAlertsWrapper.goToAlertsFlexItemLabel"
              defaultMessage="Go to alerts"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" style={{ margin: '10px' }} responsive={true}>
        <EuiFlexItem>
          <SloAlertsSummary
            slos={slos}
            deps={deps}
            timeRange={timeRange}
            onLoaded={() => setIsSummaryLoaded(true)}
            showAllGroupByInstances={showAllGroupByInstances}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <SloAlertsTable
            slos={slos}
            deps={deps}
            timeRange={timeRange}
            onLoaded={() => setIsTableLoaded(true)}
            lastReloadRequestTime={lastRefreshTime}
            showAllGroupByInstances={showAllGroupByInstances}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  overflow: scroll;
`;
