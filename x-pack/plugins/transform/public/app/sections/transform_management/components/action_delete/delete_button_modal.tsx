/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EUI_MODAL_CONFIRM_BUTTON,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TRANSFORM_STATE } from '../../../../../../common';

import { DeleteAction } from './use_delete_action';

export const DeleteButtonModal: FC<DeleteAction> = ({
  closeModal,
  deleteAndCloseModal,
  deleteDestIndex,
  deleteIndexPattern,
  indexPatternExists,
  items,
  shouldForceDelete,
  toggleDeleteIndex,
  toggleDeleteIndexPattern,
  userCanDeleteIndex,
}) => {
  const isBulkAction = items.length > 1;

  const bulkDeleteModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalTitle',
    {
      defaultMessage: 'Delete {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items.length },
    }
  );
  const deleteModalTitle = i18n.translate('xpack.transform.transformList.deleteModalTitle', {
    defaultMessage: 'Delete {transformId}',
    values: { transformId: items[0] && items[0].config.id },
  });
  const bulkDeleteModalContent = (
    <>
      <p>
        {shouldForceDelete ? (
          <FormattedMessage
            id="xpack.transform.transformList.bulkForceDeleteModalBody"
            defaultMessage="Are you sure you want to force delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}? The {count, plural, one {transform} other {transforms}} will be deleted regardless of {count, plural, one {its} other {their}} current state."
            values={{ count: items.length }}
          />
        ) : (
          <FormattedMessage
            id="xpack.transform.transformList.bulkDeleteModalBody"
            defaultMessage="Are you sure you want to delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}?"
            values={{ count: items.length }}
          />
        )}
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="transformBulkDeleteIndexSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.bulkDeleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination indices',
                }
              )}
              checked={deleteDestIndex}
              onChange={toggleDeleteIndex}
            />
          }
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="transformBulkDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.bulkDeleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete destination index patterns',
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
            />
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const deleteModalContent = (
    <>
      <p>
        {items[0] && items[0] && items[0].stats.state === TRANSFORM_STATE.FAILED ? (
          <FormattedMessage
            id="xpack.transform.transformList.forceDeleteModalBody"
            defaultMessage="Are you sure you want to force delete this transform? The transform will be deleted regardless of its current state."
          />
        ) : (
          <FormattedMessage
            id="xpack.transform.transformList.deleteModalBody"
            defaultMessage="Are you sure you want to delete this transform?"
          />
        )}
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {userCanDeleteIndex && (
            <EuiSwitch
              data-test-subj="transformDeleteIndexSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.deleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination index {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteDestIndex}
              onChange={toggleDeleteIndex}
            />
          )}
        </EuiFlexItem>
        {userCanDeleteIndex && indexPatternExists && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiSwitch
              data-test-subj="transformDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.deleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete index pattern {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={isBulkAction === true ? bulkDeleteModalTitle : deleteModalTitle}
        onCancel={closeModal}
        onConfirm={deleteAndCloseModal}
        cancelButtonText={i18n.translate('xpack.transform.transformList.deleteModalCancelButton', {
          defaultMessage: 'Cancel',
        })}
        confirmButtonText={i18n.translate('xpack.transform.transformList.deleteModalDeleteButton', {
          defaultMessage: 'Delete',
        })}
        defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        buttonColor="danger"
      >
        {isBulkAction ? bulkDeleteModalContent : deleteModalContent}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
