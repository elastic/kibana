/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { useMlKibana } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

import {
  deleteAnalytics,
  deleteAnalyticsAndDestIndex,
  canDeleteIndex,
} from '../../services/analytics_service';

import type {
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { isDataFrameAnalyticsRunning } from '../analytics_list/common';

import { deleteActionNameText, DeleteActionName } from './delete_action_name';

import type { JobType } from '../../../../../../../common/types/saved_objects';

import { getDestinationIndex } from '../../../../common/get_destination_index';

const DF_ANALYTICS_JOB_TYPE: JobType = 'data-frame-analytics';

type DataFrameAnalyticsListRowEssentials = Pick<DataFrameAnalyticsListRow, 'config' | 'stats'>;
export type DeleteAction = ReturnType<typeof useDeleteAction>;
export const useDeleteAction = (canDeleteDataFrameAnalytics: boolean) => {
  const [item, setItem] = useState<DataFrameAnalyticsListRowEssentials>();

  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isDeleteJobCheckModalVisible, setDeleteJobCheckModalVisible] = useState<boolean>(false);
  const [deleteItem, setDeleteItem] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<boolean>(true);
  const [deleteDataView, setDeleteDataView] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [userCanDeleteDataView, setUserCanDeleteDataView] = useState<boolean>(false);
  const [dataViewExists, setDataViewExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    data: { dataViews },
    application: { capabilities },
  } = useMlKibana().services;

  const indexName = getDestinationIndex(item?.config);

  const toastNotificationService = useToastNotificationService();

  const checkDataViewExists = async () => {
    try {
      const dv = (await dataViews.getIdsWithTitle(true)).find(({ title }) => title === indexName);
      if (dv !== undefined) {
        setDataViewExists(true);
      } else {
        setDataViewExists(false);
      }
      setIsLoading(false);
    } catch (e) {
      const error = extractErrorMessage(e);
      setIsLoading(false);

      toastNotificationService.displayDangerToast(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.errorWithCheckingIfDataViewExistsNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if data view {dataView} exists: {error}',
            values: { dataView: indexName, error },
          }
        )
      );
    }
  };
  const checkUserIndexPermission = async () => {
    try {
      const userCanDelete = await canDeleteIndex(indexName, toastNotificationService);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }

      const canDeleteDataView =
        capabilities.savedObjectsManagement.delete === true ||
        capabilities.indexPatterns.save === true;
      setUserCanDeleteDataView(canDeleteDataView);
      if (canDeleteDataView === false) {
        setDeleteDataView(false);
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
    // Check if a data view exists corresponding to current DFA job
    // if data view does exist, show it to user
    checkDataViewExists();
    // Check if an user has permission to delete the index & data view
    checkUserIndexPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalVisible]);

  const closeModal = () => setModalVisible(false);
  const closeDeleteJobCheckModal = () => setDeleteJobCheckModalVisible(false);
  const deleteAndCloseModal = () => {
    setDeleteItem(true);
    setModalVisible(false);

    if (item !== undefined) {
      if ((userCanDeleteIndex && deleteTargetIndex) || (userCanDeleteIndex && deleteDataView)) {
        deleteAnalyticsAndDestIndex(
          item.config,
          deleteTargetIndex,
          dataViewExists && deleteDataView,
          toastNotificationService
        );
      } else {
        deleteAnalytics(item.config, toastNotificationService);
      }
    }
  };
  const toggleDeleteIndex = () => setDeleteTargetIndex(!deleteTargetIndex);
  const toggleDeleteDataView = () => setDeleteDataView(!deleteDataView);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    action,
    closeDeleteJobCheckModal,
    closeModal,
    deleteAndCloseModal,
    deleteTargetIndex,
    deleteDataView,
    deleteItem,
    dataViewExists,
    isDeleteJobCheckModalVisible,
    isModalVisible,
    isLoading,
    item,
    jobType: DF_ANALYTICS_JOB_TYPE,
    openModal,
    openDeleteJobCheckModal,
    toggleDeleteIndex,
    toggleDeleteDataView,
    userCanDeleteIndex,
    userCanDeleteDataView,
  };
};
