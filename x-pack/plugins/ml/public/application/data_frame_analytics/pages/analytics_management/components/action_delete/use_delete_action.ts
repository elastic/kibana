/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { IIndexPattern } from 'src/plugins/data/common';

import { extractErrorMessage } from '../../../../../../../common/util/errors';

import { useMlKibana } from '../../../../../contexts/kibana';

import {
  deleteAnalytics,
  deleteAnalyticsAndDestIndex,
  canDeleteIndex,
} from '../../services/analytics_service';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

export type DeleteAction = ReturnType<typeof useDeleteAction>;
export const useDeleteAction = () => {
  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const [isModalVisible, setModalVisible] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<boolean>(true);
  const [deleteIndexPattern, setDeleteIndexPattern] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean>(false);

  const { savedObjects, notifications } = useMlKibana().services;
  const savedObjectsClient = savedObjects.client;

  const indexName = item?.config.dest.index ?? '';

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
      }
    } catch (e) {
      const { toasts } = notifications;
      const error = extractErrorMessage(e);

      toasts.addDanger(
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
      const userCanDelete = canDeleteIndex(indexName);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }
    } catch (e) {
      const { toasts } = notifications;
      const error = extractErrorMessage(e);

      toasts.addDanger(
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
    // Check if an index pattern exists corresponding to current DFA job
    // if pattern does exist, show it to user
    checkIndexPatternExists();

    // Check if an user has permission to delete the index & index pattern
    checkUserIndexPermission();
  }, []);

  const closeModal = () => setModalVisible(false);
  const deleteAndCloseModal = () => {
    setModalVisible(false);

    if (item !== undefined) {
      if ((userCanDeleteIndex && deleteTargetIndex) || (userCanDeleteIndex && deleteIndexPattern)) {
        deleteAnalyticsAndDestIndex(
          item,
          deleteTargetIndex,
          indexPatternExists && deleteIndexPattern
        );
      } else {
        deleteAnalytics(item);
      }
    }
  };
  const toggleDeleteIndex = () => setDeleteTargetIndex(!deleteTargetIndex);
  const toggleDeleteIndexPattern = () => setDeleteIndexPattern(!deleteIndexPattern);

  const openModal = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setModalVisible(true);
  };

  return {
    closeModal,
    deleteAndCloseModal,
    deleteTargetIndex,
    deleteIndexPattern,
    indexPatternExists,
    isModalVisible,
    item,
    openModal,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
    userCanDeleteIndex,
  };
};
