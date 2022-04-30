/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { DeleteAction } from './use_delete_action';

export const DeleteActionModal: FC<DeleteAction> = ({
  closeModal,
  deleteAndCloseModal,
  deleteTargetIndex,
  deleteIndexPattern,
  indexPatternExists,
  isLoading,
  item,
  toggleDeleteIndex,
  toggleDeleteIndexPattern,
  userCanDeleteIndex,
  userCanDeleteDataView,
}) => {
  if (item === undefined) {
    return null;
  }

  const indexName = item.config.dest.index;

  return (
    <EuiConfirmModal
      data-test-subj="mlAnalyticsJobDeleteModal"
      title={i18n.translate('xpack.ml.dataframe.analyticsList.deleteModalTitle', {
        defaultMessage: 'Delete {analyticsId}?',
        values: { analyticsId: item.config.id },
      })}
      onCancel={closeModal}
      onConfirm={deleteAndCloseModal}
      cancelButtonText={i18n.translate('xpack.ml.dataframe.analyticsList.deleteModalCancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.ml.dataframe.analyticsList.deleteModalDeleteButton',
        {
          defaultMessage: 'Delete',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="danger"
      confirmButtonDisabled={isLoading}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {userCanDeleteIndex && (
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexSwitch"
              style={{ paddingBottom: 10 }}
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination index {indexName}',
                  values: { indexName },
                }
              )}
              checked={deleteTargetIndex}
              onChange={toggleDeleteIndex}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          {userCanDeleteIndex && indexPatternExists && (
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexPatternSwitch"
              label={i18n.translate('xpack.ml.dataframe.analyticsList.deleteTargetDataViewTitle', {
                defaultMessage: 'Delete data view {dataView}',
                values: { dataView: indexName },
              })}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
              disabled={userCanDeleteDataView === false}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
