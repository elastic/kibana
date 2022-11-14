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
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useUserData } from '../../../detections/components/user_info';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { getListById, deleteList, exportList, updateList, getListRules } from '../../api';
import {
  checkIfListCannotBeEdited,
  isAnExceptionListItem,
  mapListRulesToUIRules,
} from '../../utils/list.utils';
import * as i18n from '../../translations';

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
    //  const rules: UIRule[] = mapListRulesToUIRules(listRules);
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
    //  try {
    //   const result = await exportList({
    //     id: exceptionListId,
    //     http,
    //     listId: exceptionListId,
    //     namespaceType: list.namespace_type,
    //   });
    //   setExportedList(result);
    //   toasts?.addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(list.name));
    // } catch (error) {
    //   handleErrorStatus(error);
    // }
  }, []);

  const onDeleteList = useCallback(async () => {
    // try {
    //   await deleteList({
    //     id: exceptionListId,
    //     http,
    //     namespaceType: list?.namespace_type,
    //   });
    //   toasts?.addSuccess(i18n.EXCEPTION_LIST_DELETED_SUCCESSFULLY(list?.name));
    //   // TODO redirect to all lists
    // } catch (error) {
    //   handleErrorStatus(error);
    // }
  }, []);

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
    allRules: [], // list.rules, // TODO fix
    canUserEditList,
    linkedRules,
    exportedList,
    viewerStatus,
    showManageRulesFlyout,
    headerBackOptions,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
  };
};
