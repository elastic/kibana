/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import type { CaseConnector } from '../../../common/api';
import type { CaseAttributes } from '../../../common/api/cases/case';
import type { CaseStatuses } from '../../../common/api/cases/status';
import type { Case, UpdateByKey, UpdateKey } from '../../containers/types';
import { useUpdateCase } from '../../containers/use_update_case';
import { getTypedPayload } from '../../containers/utils';
import type { OnUpdateFields } from './types';

export const useOnUpdateField = ({ caseData, caseId }: { caseData: Case; caseId: string }) => {
  const { isLoading, updateKey: loadingKey, updateCaseProperty } = useUpdateCase();

  const onUpdateField = useCallback(
    ({ key, value, onSuccess, onError }: OnUpdateFields) => {
      const callUpdate = (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) =>
        updateCaseProperty({
          updateKey,
          updateValue,
          caseData,
          onSuccess,
          onError,
        });

      switch (key) {
        case 'title':
          const titleUpdate = getTypedPayload<string>(value);
          if (titleUpdate.length > 0) {
            callUpdate('title', titleUpdate);
          }
          break;
        case 'connector':
          const connector = getTypedPayload<CaseConnector>(value);
          if (connector != null) {
            callUpdate('connector', connector);
          }
          break;
        case 'description':
          const descriptionUpdate = getTypedPayload<string>(value);
          if (descriptionUpdate.length > 0) {
            callUpdate('description', descriptionUpdate);
          }
          break;
        case 'tags':
          const tagsUpdate = getTypedPayload<string[]>(value);
          callUpdate('tags', tagsUpdate);
          break;
        case 'status':
          const statusUpdate = getTypedPayload<CaseStatuses>(value);
          if (caseData.status !== value) {
            callUpdate('status', statusUpdate);
          }
          break;
        case 'settings':
          const settingsUpdate = getTypedPayload<CaseAttributes['settings']>(value);
          if (caseData.settings !== value) {
            callUpdate('settings', settingsUpdate);
          }
          break;
        case 'severity':
          const severityUpdate = getTypedPayload<CaseAttributes['severity']>(value);
          if (caseData.severity !== value) {
            callUpdate('severity', severityUpdate);
          }
          break;
        case 'assignees':
          const assigneesUpdate = getTypedPayload<CaseAttributes['assignees']>(value);
          if (!deepEqual(caseData.assignees, value)) {
            callUpdate('assignees', assigneesUpdate);
          }
          break;
        default:
          return null;
      }
    },
    [updateCaseProperty, caseData]
  );
  return { onUpdateField, isLoading, loadingKey };
};
