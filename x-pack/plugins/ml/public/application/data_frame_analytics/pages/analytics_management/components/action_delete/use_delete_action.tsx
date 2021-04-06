/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { IIndexPattern } from 'src/plugins/data/common';

import { extractErrorMessage } from '../../../../../../../common/util/errors';

import { useMlKibana } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

import {
  deleteAnalytics,
  deleteAnalyticsAndDestIndex,
  canDeleteIndex,
} from '../../services/analytics_service';

import {
  isDataFrameAnalyticsRunning,
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';

import { deleteActionNameText, DeleteActionName } from './delete_action_name';

import { JobType } from '../../../../../../../common/types/saved_objects';

const DF_ANALYTICS_JOB_TYPE: JobType = 'data-frame-analytics';

type DataFrameAnalyticsListRowEssentials = Pick<DataFrameAnalyticsListRow, 'config' | 'stats'>;
export type DeleteAction = ReturnType<typeof useDeleteAction>;
export const useDeleteAction = (canDeleteDataFrameAnalytics: boolean) => {
  const [item, setItem] = useState<DataFrameAnalyticsListRowEssentials>();

  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isDeleteJobCheckModalVisible, setDeleteJobCheckModalVisible] = useState<boolean>(false);
  const [deleteItem, setDeleteItem] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<boolean>(true);
  const [deleteIndexPattern, setDeleteIndexPattern] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { savedObjects } = useMlKibana().services;
  const savedObjectsClient = savedObjects.client;

  const indexName = item?.config.dest.index ?? '';

  const toastNotificationService = useToastNotificationService();

  const checkIndexPatternExists = async () => {
    try {
      const response = await savedObjectsClient.find<IIndexPattern>({
        type: 'index-pattern',
        perPage: 10,
        search: `"${indexName}"`,
        searchFields: ['title'],
        fields: ['title'],
      });
      const ip = response.savedObjects.find(
        (obj) => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
      );
      if (ip !== undefined) {
        setIndexPatternExists(true);
      } else {
        setIndexPatternExists(false);
      }
      setIsLoading(false);
    } catch (e) {
      const error = extractErrorMessage(e);
      setIsLoading(false);

      toastNotificationService.displayDangerToast(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.errorWithCheckingIfIndexPatternExistsNotificationErrorMessage',
          {
            defaultMessage:
              'An error occurred checking if index pattern {indexPattern} exists: {error}',
            values: { indexPattern: indexName, error },
          }
        )
      );
    }
  };
  const checkUserIndexPermission = () => {
    try {
      const userCanDelete = canDeleteIndex(indexName, toastNotificationService);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }
    } catch (e) {
      const error = extractErrorMessage(e);
      setIsLoading(false);

      toastNotificationService.displayDangerToast(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.errorWithCheckingIfUserCanDeleteIndexNotificationErrorMessage',
          {
            defaultMessage:
              'An error occurred checking if user can delete {destinationIndex}: {error}',
            values: { destinationIndex: indexName, error },
          }
        )
      );
    }
  };

  useEffect(() => {
    setIsLoading(true);
    // Check if an index pattern exists corresponding to current DFA job
    // if pattern does exist, show it to user
    checkIndexPatternExists();
    // Check if an user has permission to delete the index & index pattern
    checkUserIndexPermission();
  }, [isModalVisible]);

  const closeModal = () => setModalVisible(false);
  const closeDeleteJobCheckModal = () => setDeleteJobCheckModalVisible(false);
  const deleteAndCloseModal = () => {
    setDeleteItem(true);
    setModalVisible(false);

    if (item !== undefined) {
      if ((userCanDeleteIndex && deleteTargetIndex) || (userCanDeleteIndex && deleteIndexPattern)) {
        deleteAnalyticsAndDestIndex(
          item.config,
          item.stats,
          deleteTargetIndex,
          indexPatternExists && deleteIndexPattern,
          toastNotificationService
        );
      } else {
        deleteAnalytics(item.config, item.stats, toastNotificationService);
      }
    }
  };
  const toggleDeleteIndex = () => setDeleteTargetIndex(!deleteTargetIndex);
  const toggleDeleteIndexPattern = () => setDeleteIndexPattern(!deleteIndexPattern);

  const openModal = (newItem: DataFrameAnalyticsListRowEssentials) => {
    setItem(newItem);
    setModalVisible(true);
  };

  const openDeleteJobCheckModal = (newItem: DataFrameAnalyticsListRowEssentials) => {
    setItem(newItem);
    setDeleteJobCheckModalVisible(true);
  };

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: (i: DataFrameAnalyticsListRow) => (
        <DeleteActionName
          isDisabled={isDataFrameAnalyticsRunning(i.stats.state) || !canDeleteDataFrameAnalytics}
          item={i}
        />
      ),
      enabled: (i: DataFrameAnalyticsListRow) =>
        !isDataFrameAnalyticsRunning(i.stats.state) && canDeleteDataFrameAnalytics,
      description: deleteActionNameText,
      icon: 'trash',
      type: 'icon',
      onClick: (i: DataFrameAnalyticsListRow) => openDeleteJobCheckModal(i),
      'data-test-subj': 'mlAnalyticsJobDeleteButton',
    }),
    []
  );

  return {
    action,
    closeDeleteJobCheckModal,
    closeModal,
    deleteAndCloseModal,
    deleteTargetIndex,
    deleteIndexPattern,
    deleteItem,
    indexPatternExists,
    isDeleteJobCheckModalVisible,
    isModalVisible,
    isLoading,
    item,
    jobType: DF_ANALYTICS_JOB_TYPE,
    openModal,
    openDeleteJobCheckModal,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
    userCanDeleteIndex,
  };
};
