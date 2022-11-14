/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BackOptions,
  ListDetails,
  Rule as UIRule,
} from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useParams } from 'react-router-dom';
import type { ExceptionListSchema, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { patchRule } from '../../../detection_engine/rule_management/logic';
import { useUserData } from '../../../detections/components/user_info';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { getListById, updateList, getListRules, exportList, deleteList } from '../../api';
import { checkIfListCannotBeEdited, isAnExceptionListItem } from '../../utils/list.utils';
import * as i18n from '../../translations';

interface ReferenceModalState {
  contentText: string;
  rulesReferences: string[];
  isLoading: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
}

const exceptionReferenceModalInitialState: ReferenceModalState = {
  contentText: '',
  rulesReferences: [],
  isLoading: false,
  listId: '',
  listNamespaceType: 'single',
};

export const useExceptionListDetails = () => {
  const toasts = useToasts();
  const { services } = useKibana();
  const { http } = services;
  const { navigateToApp } = services.application;

  const [{ loading: userInfoLoading, canUserCRUD, canUserREAD }] = useUserData();
  const [isLoading, setIsLoading] = useState<boolean>();
  const [list, setList] = useState<ExceptionListSchema | null>(null);
  const [invalidListId, setInvalidListId] = useState(false);
  const [linkedRules, setLinkedRules] = useState<UIRule[]>([]);
  const [canUserEditList, setCanUserEditList] = useState(true);
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>('');
  const [exportedList, setExportedList] = useState<Blob>();
  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
  const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
    exceptionReferenceModalInitialState
  );

  const { exceptionListId } = useParams<{
    exceptionListId: string;
  }>();

  const headerBackOptions: BackOptions = useMemo(
    () => ({
      pageId: SecurityPageName.exceptions,
      path: '',
      onNavigate: () => {
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.exceptions,
          path: '',
        });
      },
    }),
    [navigateToApp]
  );

  const handleErrorStatus = useCallback(
    (error: Error, errorTitle?: string, errorDescription?: string) => {
      toasts?.addError(error, {
        title: errorTitle || i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: errorDescription || i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [toasts]
  );

  const initializeListRules = useCallback(async (result) => {
    const listRules = await getListRules(result.list_id);
    setLinkedRules(listRules);
  }, []);

  const initializeList = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getListById({
        id: exceptionListId,
        http,
      });
      if (!result || !isAnExceptionListItem(result)) return setInvalidListId(true);

      setList(result);
      await initializeListRules(result);
      setIsLoading(false);

      setInvalidListId(false);
      if (checkIfListCannotBeEdited(result)) return setCanUserEditList(false);
    } catch (error) {
      setIsLoading(false);
      handleErrorStatus(error);
    }
  }, [exceptionListId, http, initializeListRules, handleErrorStatus]);

  useEffect(() => {
    initializeList();
  }, [initializeList]);

  const [showManageRulesFlyout, setShowManageRulesFlyout] = useState(false);

  const onEditListDetails = useCallback(
    async (listDetails: ListDetails) => {
      try {
        if (list)
          await updateList({
            http,
            list: {
              id: list.id,
              list_id: exceptionListId,
              type: list.type,
              name: listDetails.name,
              description: listDetails.description || list.description,
            },
          });
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [exceptionListId, handleErrorStatus, http, list]
  );
  const onExportList = useCallback(async () => {
    try {
      if (!list) return;
      const result = await exportList({
        id: exceptionListId,
        http,
        listId: exceptionListId,
        namespaceType: list.namespace_type,
      });
      setExportedList(result);
      toasts?.addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(list.list_id));
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [exceptionListId, http, list, toasts, handleErrorStatus]);

  const onDeleteList = useCallback(async () => {
    try {
      if (!list) return;
      await deleteList({
        id: exceptionListId,
        http,
        namespaceType: list.namespace_type,
      });
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [exceptionListId, http, list, handleErrorStatus]);

  const handleDelete = useCallback(() => {
    try {
      if (!list) return;
      setReferenceModalState({
        contentText: i18n.referenceErrorMessage(linkedRules.length),
        rulesReferences: linkedRules.map(({ name }) => name),
        isLoading: true,
        listId: list.list_id,
        listNamespaceType: list.namespace_type,
      });
      setShowReferenceErrorModal(true);
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, linkedRules, list]);
  const handleCloseReferenceErrorModal = useCallback((): void => {
    setShowReferenceErrorModal(false);
    setReferenceModalState({
      contentText: '',
      rulesReferences: [],
      isLoading: false,
      listId: '',
      listNamespaceType: 'single',
    });
  }, []);
  const handleReferenceDelete = useCallback(async (): Promise<void> => {
    try {
      await Promise.all(
        linkedRules.map((rule) => {
          const abortCtrl = new AbortController();
          const exceptionLists = (rule.exceptions_list ?? []).filter(
            ({ id }) => id !== exceptionListId
          );

          return patchRule({
            ruleProperties: {
              rule_id: rule.rule_id,
              exceptions_list: exceptionLists,
            },
            signal: abortCtrl.signal,
          });
        })
      );

      onDeleteList();
    } catch (err) {
      handleErrorStatus(err);
    } finally {
      setReferenceModalState(exceptionReferenceModalInitialState);
      setShowReferenceErrorModal(false);

      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.exceptions,
        path: '',
      });
    }
  }, [exceptionListId, handleErrorStatus, linkedRules, navigateToApp, onDeleteList]);

  const onManageRules = useCallback(() => {
    setShowManageRulesFlyout(true);
  }, []);
  const onSaveManageRules = useCallback(() => {
    // TODO: call API To save
    setShowManageRulesFlyout(false);
  }, []);
  const onCancelManageRules = useCallback(() => {
    setShowManageRulesFlyout(false);
  }, []);
  const onRuleSelectionChange = useCallback(() => {}, []);
  return {
    isLoading: isLoading || userInfoLoading,
    invalidListId,
    isReadOnly: !!(!canUserCRUD && canUserREAD),
    list,
    listName: list?.name,
    listDescription: list?.description,
    listId: exceptionListId,
    canUserEditList,
    linkedRules,
    exportedList,
    viewerStatus,
    showManageRulesFlyout,
    headerBackOptions,
    referenceModalState,
    showReferenceErrorModal,
    handleDelete,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
    handleCloseReferenceErrorModal,
    handleReferenceDelete,
  };
};
