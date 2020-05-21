/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
import { IIndexPattern } from 'src/plugins/data/common';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  deleteAnalytics,
  deleteAnalyticsAndTargetIndex,
  checkUserCanDeleteIndex,
} from '../../services/analytics_service';
import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../capabilities/check_capabilities';
import { useMlKibana } from '../../../../../contexts/kibana';
import { isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from './common';

interface DeleteActionProps {
  item: DataFrameAnalyticsListRow;
}

export const DeleteAction: FC<DeleteActionProps> = ({ item }) => {
  const disabled = isDataFrameAnalyticsRunning(item.stats.state);
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');

  const [isModalVisible, setModalVisible] = useState(false);
  const [deleteTargetIndex, toggleDeleteTargetIndex] = useState<boolean>(true);
  const [deleteIndexPattern, toggleDeleteIndexPattern] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean>(false);

  const { savedObjects, notifications } = useMlKibana().services;
  const { toasts } = notifications;
  const savedObjectsClient = savedObjects.client;

  const indexName = item.config.dest.index;

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
        obj => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
      );
      if (ip !== undefined) {
        setIndexPatternExists(true);
      }
    } catch (error) {
      toasts.addDanger(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.errorWithCheckingIfIndexPatternExistsNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if index pattern ${indexPattern} exists',
            values: { indexPattern: indexName, error: JSON.stringify(error) },
          }
        )
      );
    }
  };
  const checkUserIndexPermission = () => {
    try {
      const userCanDelete = checkUserCanDeleteIndex(indexName);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }
    } catch (error) {
      toasts.addDanger(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.errorWithCheckingIfUserCanDeleteIndexNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if user can delete ${destinationIndex}',
            values: { destinationIndex: indexName, error: JSON.stringify(error) },
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

    if (userCanDeleteIndex && deleteTargetIndex) {
      deleteAnalyticsAndTargetIndex(
        item,
        deleteTargetIndex,
        indexPatternExists && deleteIndexPattern
      );
    } else {
      deleteAnalytics(item);
    }
  };
  const openModal = () => setModalVisible(true);

  const buttonDeleteText = i18n.translate('xpack.ml.dataframe.analyticsList.deleteActionName', {
    defaultMessage: 'Delete',
  });

  let deleteButton = (
    <EuiButtonEmpty
      data-test-subj="mlAnalyticsJobDeleteButton"
      size="xs"
      color="text"
      disabled={disabled || !canDeleteDataFrameAnalytics}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonDeleteText}
      style={{ padding: 0 }}
    >
      {buttonDeleteText}
    </EuiButtonEmpty>
  );

  if (disabled || !canDeleteDataFrameAnalytics) {
    deleteButton = (
      <EuiToolTip
        position="top"
        content={
          disabled
            ? i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteActionDisabledToolTipContent',
                {
                  defaultMessage: 'Stop the data frame analytics in order to delete it.',
                }
              )
            : createPermissionFailureMessage('canStartStopDataFrameAnalytics')
        }
      >
        {deleteButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {deleteButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.analyticsList.deleteModalTitle', {
              defaultMessage: 'Delete {analyticsId}',
              values: { analyticsId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={deleteAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.deleteModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.deleteModalDeleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            <p>
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsList.deleteAnalytics.deleteModalBody"
                defaultMessage="Are you sure you want to delete this analytics job?"
              />
            </p>

            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                {userCanDeleteIndex && (
                  <EuiSwitch
                    style={{ paddingBottom: 10 }}
                    label={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.deleteDestinationIndexTitle',
                      {
                        defaultMessage: 'Delete destination index',
                      }
                    )}
                    checked={deleteTargetIndex}
                    onChange={() => toggleDeleteTargetIndex(!deleteTargetIndex)}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                {userCanDeleteIndex && indexPatternExists && (
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.deleteTargetIndexTitle',
                      {
                        defaultMessage: 'Delete index pattern',
                      }
                    )}
                    checked={deleteIndexPattern}
                    onChange={() => toggleDeleteIndexPattern(!deleteIndexPattern)}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
