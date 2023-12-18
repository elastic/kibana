/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { useMemo } from 'react';
import { get, noop } from 'lodash/fp';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useAddBulkToTimelineAction } from '../../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { AlertRawData } from '../content';

/**
 * The returned actions only support alerts risk inputs.
 */
export const useRiskInputActions = (alerts: AlertRawData[], closePopover: () => void) => {
  const { from, to } = useGlobalTime();
  const timelineAction = useAddBulkToTimelineAction({
    localFilters: [],
    from,
    to,
    scopeId: SourcererScopeName.detections,
    tableId: TableId.riskInputs,
  });

  const { cases: casesService } = useKibana().services;
  const createCaseFlyout = casesService?.hooks.useCasesAddToNewCaseFlyout({ onSuccess: noop });
  const selectCaseModal = casesService?.hooks.useCasesAddToExistingCaseModal();

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(
    () =>
      alerts.map((alert: AlertRawData) => ({
        alertId: alert._id,
        index: alert._index,
        type: AttachmentType.alert,
        rule: {
          id: get(ALERT_RULE_UUID, alert.fields)[0],
          name: get(ALERT_RULE_NAME, alert.fields)[0],
        },
      })),
    [alerts]
  );

  return useMemo(
    () => ({
      addToExistingCase: () => {
        closePopover();
        selectCaseModal.open({ getAttachments: () => caseAttachments });
      },
      addToNewCaseClick: () => {
        closePopover();
        createCaseFlyout.open({ attachments: caseAttachments });
      },
      addToNewTimeline: () => {
        closePopover();
        timelineAction.onClick(
          alerts.map((alert: AlertRawData) => {
            return {
              _id: alert._id,
              _index: alert._index,
              data: [],
              ecs: {
                _id: alert._id,
                _index: alert._index,
              },
            };
          }),
          false,
          noop,
          noop,
          noop
        );
      },
    }),
    [alerts, caseAttachments, closePopover, createCaseFlyout, selectCaseModal, timelineAction]
  );
};
