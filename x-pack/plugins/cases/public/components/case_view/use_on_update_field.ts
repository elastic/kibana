/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CaseConnector } from '../../../common/api';
import { CaseAttributes } from '../../../common/api/cases/case';
import { CaseStatuses } from '../../../common/api/cases/status';
import { Case, UpdateByKey, UpdateKey } from '../../containers/types';
import { useUpdateCase } from '../../containers/use_update_case';
import { getTypedPayload } from '../../containers/utils';
import { OnUpdateFields } from './types';

export const useOnUpdateField = ({
  caseData,
  caseId,
  handleUpdateField,
}: {
  caseData: Case;
  caseId: string;
  handleUpdateField: (newCase: Case, updateKey: UpdateKey) => void;
}) => {
  const { isLoading, updateKey: loadingKey, updateCaseProperty } = useUpdateCase({ caseId });

  const onUpdateField = useCallback(
    ({ key, value, onSuccess, onError }: OnUpdateFields) => {
      const callUpdate = (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) =>
        updateCaseProperty({
          updateKey,
          updateValue,
          updateCase: (newCase) => handleUpdateField(newCase, updateKey),
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
        default:
          return null;
      }
    },
    [updateCaseProperty, handleUpdateField, caseData]
  );
  return { onUpdateField, isLoading, loadingKey };
};
