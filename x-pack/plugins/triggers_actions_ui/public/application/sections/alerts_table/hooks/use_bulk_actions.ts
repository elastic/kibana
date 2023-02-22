/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect, useMemo } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Alerts,
  BulkActionsConfig,
  BulkActionsState,
  BulkActionsVerbs,
  UseBulkActionsRegistry,
} from '../../../../types';
import { BulkActionsContext } from '../bulk_actions/context';
import {
  getLeadingControlColumn as getBulkActionsLeadingControlColumn,
  GetLeadingControlColumn,
} from '../bulk_actions/get_leading_control_column';
import { CasesService } from '../types';
import { ADD_TO_CASE_DISABLED, ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from './translations';
import { useGetUserCasesPermissions } from './use_get_user_cases_permissions';

interface BulkActionsProps {
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  alerts: Alerts;
  casesService?: CasesService;
  casesFeatureId: string;
  useBulkActionsConfig?: UseBulkActionsRegistry;
}

export interface UseBulkActions {
  isBulkActionsColumnActive: boolean;
  getBulkActionsLeadingControlColumn: GetLeadingControlColumn;
  bulkActionsState: BulkActionsState;
  bulkActions: BulkActionsConfig[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
}

type UseBulkAddToCaseActionsProps = Pick<BulkActionsProps, 'casesService' | 'casesFeatureId'>;

export const useBulkAddToCaseActions = ({
  casesService,
  casesFeatureId,
}: UseBulkAddToCaseActionsProps): BulkActionsConfig[] => {
  const userCasesPermissions = useGetUserCasesPermissions(casesFeatureId);

  const createCaseFlyout = casesService?.hooks.getUseCasesAddToNewCaseFlyout();
  const selectCaseModal = casesService?.hooks.getUseCasesAddToExistingCaseModal();

  return useMemo(() => {
    return casesService &&
      createCaseFlyout &&
      selectCaseModal &&
      userCasesPermissions.create &&
      userCasesPermissions.read
      ? [
          {
            label: ADD_TO_NEW_CASE,
            key: 'attach-new-case',
            'data-test-subj': 'attach-new-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_CASE_DISABLED,
            onClick: (items?: any[]) => {
              const caseAttachments = items ? casesService.helpers.groupAlertsByRule(items) : [];
              createCaseFlyout.open({ attachments: caseAttachments });
            },
          },
          {
            label: ADD_TO_EXISTING_CASE,
            key: 'attach-existing-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_CASE_DISABLED,
            'data-test-subj': 'attach-existing-case',
            onClick: (items?: any[]) => {
              const caseAttachments = items ? casesService.helpers.groupAlertsByRule(items) : [];
              selectCaseModal.open({ attachments: caseAttachments });
            },
          },
        ]
      : [];
  }, [
    casesService,
    createCaseFlyout,
    selectCaseModal,
    userCasesPermissions.create,
    userCasesPermissions.read,
  ]);
};

export function useBulkActions({
  alerts,
  casesService,
  casesFeatureId,
  query,
  useBulkActionsConfig = () => [],
}: BulkActionsProps): UseBulkActions {
  const [bulkActionsState, updateBulkActionsState] = useContext(BulkActionsContext);
  const configBulkActions = useBulkActionsConfig(query);
  const caseBulkActions = useBulkAddToCaseActions({ casesService, casesFeatureId });

  const bulkActions = [...configBulkActions, ...caseBulkActions];

  const isBulkActionsColumnActive = bulkActions.length !== 0;

  useEffect(() => {
    updateBulkActionsState({ action: BulkActionsVerbs.rowCountUpdate, rowCount: alerts.length });
  }, [alerts, updateBulkActionsState]);

  const setIsBulkActionsLoading = (isLoading: boolean = true) => {
    updateBulkActionsState({ action: BulkActionsVerbs.updateAllLoadingState, isLoading });
  };

  const clearSelection = () => {
    updateBulkActionsState({ action: BulkActionsVerbs.clear });
  };

  return {
    isBulkActionsColumnActive,
    getBulkActionsLeadingControlColumn,
    bulkActionsState,
    bulkActions,
    setIsBulkActionsLoading,
    clearSelection,
  };
}
