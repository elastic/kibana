/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { LazySavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { useState, useCallback, useMemo } from 'react';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiContextMenuProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { useDataSource } from '../../../hooks/use_data_source';
import type { LogRateAnalysisEmbeddableState } from '../../../embeddables/log_rate_analysis/types';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const LogRateAnalysisAttachmentsMenu = () => {
  const {
    application: { capabilities },
    embeddable,
  } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const [applyTimeRange, setApplyTimeRange] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [dashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);

  const timeRange = useTimeRangeUpdates();

  const canEditDashboards = capabilities.dashboard.createNew;

  const onSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();

      const embeddableInput: Partial<LogRateAnalysisEmbeddableState> = {
        title: newTitle,
        description: newDescription,
        dataViewId: dataView.id,
        hidePanelTitles: false,
        ...(applyTimeRange && { timeRange }),
      };

      const state = {
        input: embeddableInput,
        type: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', { state, path });
    },
    [dataView.id, embeddable, applyTimeRange, timeRange]
  );

  const panels = useMemo<Exclude<EuiContextMenuProps['panels'], undefined>>(() => {
    return [
      {
        id: 'attachMainPanel',
        size: 's',
        items: [
          ...(canEditDashboards
            ? [
                {
                  name: i18n.translate('xpack.aiops.logRateAnalysis.addToDashboardTitle', {
                    defaultMessage: 'Add to dashboard',
                  }),
                  panel: 'attachToDashboardPanel',
                  'data-test-subj': 'aiopsLogRateAnalysisAttachToDashboardButton',
                },
              ]
            : []),
        ],
      },
      {
        id: 'attachToDashboardPanel',
        size: 's',
        title: i18n.translate('xpack.aiops.logRateAnalysis.attachToDashboardTitle', {
          defaultMessage: 'Add to dashboard',
        }),
        content: (
          <EuiPanel paddingSize="s">
            <EuiSpacer size="s" />
            <EuiForm>
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate('xpack.aiops.logRateAnalysis.applyTimeRangeLabel', {
                    defaultMessage: 'Apply time range',
                  })}
                  checked={applyTimeRange}
                  onChange={(e) => setApplyTimeRange(e.target.checked)}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                data-test-subj="aiopsLogRateAnalysisAttachToDashboardSubmitButton"
                fill
                fullWidth
                type={'submit'}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setDashboardAttachmentReady(true);
                }}
              >
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.attachToDashboardSubmitButtonLabel"
                  defaultMessage="Add to dashboard"
                />
              </EuiButton>
            </EuiForm>
          </EuiPanel>
        ),
      },
    ];
  }, [canEditDashboards, applyTimeRange]);

  return (
    <>
      {!!panels[0]?.items?.length && (
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="aiopsLogRateAnalysisAttachmentsMenuButton"
                aria-label={i18n.translate('xpack.aiops.logRateAnalysis.attachmentsMenuAriaLabel', {
                  defaultMessage: 'Attachments',
                })}
                iconType="boxesHorizontal"
                color="text"
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              />
            }
            isOpen={isActionMenuOpen}
            closePopover={() => setIsActionMenuOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenu panels={panels} initialPanelId="attachMainPanel" />
          </EuiPopover>
        </EuiFlexItem>
      )}
      {dashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          canSaveByReference={false}
          objectType={i18n.translate('xpack.aiops.logRateAnalysis.objectTypeLabel', {
            defaultMessage: 'Log rate analysis',
          })}
          documentInfo={{
            title: 'Log rate analysis',
          }}
          onClose={() => setDashboardAttachmentReady(false)}
          onSave={onSave}
        />
      ) : null}
    </>
  );
};
