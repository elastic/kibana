/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText, EuiTitle } from '@elastic/eui';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { rollingTimeWindowTypeSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState, useCallback } from 'react';
import { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { toDuration, toMinutes } from '../../../utils/slo/duration';
import { ChartData } from '../../../typings/slo';
import { useKibana } from '../../../utils/kibana_react';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';
import { ErrorBudgetActions } from './error_budget_actions';
import { ErrorBudgetChart } from './error_budget_chart';
import { useErrorBudgetActions } from '../hooks/use_error_budget_actions';
import { SLO_ERROR_BUDGET_EMBEDDABLE } from '../../../embeddable/slo/error_budget/slo_error_budget_embeddable';
const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);
export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

function formatTime(minutes: number) {
  if (minutes > 59) {
    const mins = minutes % 60;
    const hours = (minutes - mins) / 60;
    return i18n.translate(
      'xpack.observability.slo.sloDetails.errorBudgetChartPanel.minuteHoursLabel',
      {
        defaultMessage: '{hours}h {mins}m',
        values: { hours: Math.trunc(hours), mins: Math.trunc(mins) },
      }
    );
  }
  return i18n.translate('xpack.observability.slo.sloDetails.errorBudgetChartPanel.minuteLabel', {
    defaultMessage: '{minutes}m',
    values: { minutes },
  });
}

export function ErrorBudgetChartPanel({ data, isLoading, slo }: Props) {
  const [isMouseOver, setIsMouseOver] = useState(false);

  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);
  const { uiSettings, embeddable, executionContext } = useKibana().services;
  const executionContextName = executionContext.get().name;
  const isDashboardContext = executionContextName === 'dashboards';
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';

  let errorBudgetTimeRemainingFormatted;
  if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'calendarAligned') {
    const totalSlices =
      toMinutes(toDuration(slo.timeWindow.duration)) /
      toMinutes(toDuration(slo.objective.timesliceWindow!));
    const errorBudgetRemainingInMinute =
      slo.summary.errorBudget.remaining * (slo.summary.errorBudget.initial * totalSlices);

    errorBudgetTimeRemainingFormatted = formatTime(
      errorBudgetRemainingInMinute >= 0 ? errorBudgetRemainingInMinute : 0
    );
  }

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();
      const embeddableInput = {
        title: newTitle,
        description: newDescription,
        sloId: slo.id,
        sloInstanceId: slo.instanceId,
      };

      const state = {
        input: embeddableInput,
        type: SLO_ERROR_BUDGET_EMBEDDABLE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId]
  );

  return (
    <>
      <EuiPanel
        paddingSize="m"
        color="transparent"
        hasBorder
        data-test-subj="errorBudgetChartPanel"
        onMouseOver={() => {
          if (!isMouseOver) {
            setIsMouseOver(true);
          }
        }}
        onMouseLeave={() => {
          if (isMouseOver) {
            setIsMouseOver(false);
          }
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate(
                        'xpack.observability.slo.sloDetails.errorBudgetChartPanel.title',
                        {
                          defaultMessage: 'Error budget burn down',
                        }
                      )}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>

                {!isDashboardContext && (
                  <EuiFlexGroup justifyContent="flexEnd" wrap>
                    {isMouseOver && (
                      <EuiFlexItem grow={false}>
                        <ErrorBudgetActions
                          setDashboardAttachmentReady={setDashboardAttachmentReady}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                  ? i18n.translate(
                      'xpack.observability.slo.sloDetails.errorBudgetChartPanel.duration',
                      {
                        defaultMessage: 'Last {duration}',
                        values: { duration: toDurationLabel(slo.timeWindow.duration) },
                      }
                    )
                  : toDurationAdverbLabel(slo.timeWindow.duration)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <ErrorBudgetChart slo={slo} data={data} isLoading={isLoading} />
        </EuiFlexGroup>
      </EuiPanel>
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.observability.slo.item.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Error Budget' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.observability.slo.item.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Error Budget' }
            ),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </>
  );
}
