/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { DeleteAction } from './use_delete_action';

export const DeleteActionModal: FC<DeleteAction> = ({
  closeModal,
  deleteAndCloseModal,
  deleteTargetIndex,
  deleteIndexPattern,
  indexPatternExists,
  item,
  toggleDeleteIndex,
  toggleDeleteIndexPattern,
  userCanDeleteIndex,
}) => {
  if (item === undefined) {
    return null;
  }

  const indexName = item.config.dest.index;

  return (
    <EuiOverlayMask data-test-subj="mlAnalyticsJobDeleteOverlay">
      <EuiConfirmModal
        data-test-subj="mlAnalyticsJobDeleteModal"
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
            id="xpack.ml.dataframe.analyticsList.deleteModalBody"
            defaultMessage="Are you sure you want to delete this analytics job?"
          />
        </p>

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
                label={i18n.translate(
                  'xpack.ml.dataframe.analyticsList.deleteTargetIndexPatternTitle',
                  {
                    defaultMessage: 'Delete index pattern {indexPattern}',
                    values: { indexPattern: indexName },
                  }
                )}
                checked={deleteIndexPattern}
                onChange={toggleDeleteIndexPattern}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
