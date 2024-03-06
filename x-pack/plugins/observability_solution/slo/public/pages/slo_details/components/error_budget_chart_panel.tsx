/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState, useCallback } from 'react';
import { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { ChartData } from '../../../typings/slo';
import { ErrorBudgetChart } from './error_budget_chart';
import { ErrorBudgetHeader } from './error_budget_header';
import { SLO_ERROR_BUDGET_EMBEDDABLE } from '../../../embeddable/slo/error_budget/slo_error_budget_embeddable';
const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);
export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
}

export function ErrorBudgetChartPanel({ data, isLoading, slo }: Props) {
  const [isMouseOver, setIsMouseOver] = useState(false);

  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);
  const { embeddable } = useKibana().services;

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
          <ErrorBudgetHeader
            slo={slo}
            showTitle={true}
            isMouseOver={isMouseOver}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />

          <ErrorBudgetChart slo={slo} data={data} isLoading={isLoading} />
        </EuiFlexGroup>
      </EuiPanel>
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Error Budget burn down' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Error Budget burn down' }
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
