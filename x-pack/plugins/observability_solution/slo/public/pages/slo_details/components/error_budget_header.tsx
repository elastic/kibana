/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { rollingTimeWindowTypeSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SloTabId } from './slo_details';
import { useKibana } from '../../../hooks/use_kibana';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';

import { ErrorBudgetActions } from './error_budget_actions';

interface Props {
  slo: SLOWithSummaryResponse;
  showTitle?: boolean;
  isMouseOver?: boolean;
  setDashboardAttachmentReady?: (value: boolean) => void;
  selectedTabId?: SloTabId;
}

export function ErrorBudgetHeader({
  slo,
  showTitle = true,
  isMouseOver,
  setDashboardAttachmentReady,
  selectedTabId,
}: Props) {
  const { executionContext } = useKibana().services;
  const executionContextName = executionContext.get().name;
  const isDashboardContext = executionContextName === 'dashboards';

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGroup>
          {showTitle && (
            <EuiFlexItem>
              <EuiTitle size="xs" data-test-subj="errorBudgetPanelTitle">
                <h2>
                  {i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.title', {
                    defaultMessage: 'Error budget burn down',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          )}
          {!isDashboardContext && (
            <EuiFlexGroup justifyContent="flexEnd" wrap>
              {isMouseOver && (
                <EuiFlexItem grow={false}>
                  <ErrorBudgetActions setDashboardAttachmentReady={setDashboardAttachmentReady} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {selectedTabId !== 'history' && (
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
              ? i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.duration', {
                  defaultMessage: 'Last {duration}',
                  values: { duration: toDurationLabel(slo.timeWindow.duration) },
                })
              : toDurationAdverbLabel(slo.timeWindow.duration)}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
