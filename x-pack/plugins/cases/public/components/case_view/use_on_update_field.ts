/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import type { CaseStatuses, CaseAttributes, CaseConnector } from '../../../common/types/domain';
import type { CaseUI, UpdateByKey, UpdateKey } from '../../containers/types';
import { useUpdateCase } from '../../containers/use_update_case';
import { getTypedPayload } from '../../containers/utils';
import type { OnUpdateFields } from './types';

export const useOnUpdateField = ({ caseData }: { caseData: CaseUI }) => {
  const { isLoading, mutate: updateCaseProperty } = useUpdateCase();
  const [loadingKey, setLoadingKey] = useState<UpdateKey | null>(null);

  const onUpdateField = useCallback(
    ({ key, value, onSuccess, onError }: OnUpdateFields) => {
      const callUpdate = (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) => {
        setLoadingKey(updateKey);

        updateCaseProperty(
          {
            updateKey,
            updateValue,
            caseData,
          },
          {
            onSuccess: () => {
              onSuccess?.();
              setLoadingKey(null);
            },
            onError: () => {
              onError?.();
              setLoadingKey(null);
            },
          }
        );
      };

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
        case 'category':
          const categoryUpdate = getTypedPayload<string>(value);
          callUpdate('category', categoryUpdate);
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
        case 'customFields':
          const customFields = getTypedPayload<CaseAttributes['customFields']>(value);
          if (!deepEqual(caseData.customFields, value)) {
            callUpdate('customFields', customFields);
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
