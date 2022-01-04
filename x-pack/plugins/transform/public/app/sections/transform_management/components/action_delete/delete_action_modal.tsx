/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EUI_MODAL_CONFIRM_BUTTON,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DeleteAction } from './use_delete_action';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

export const DeleteActionModal: FC<DeleteAction> = ({
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
  userCanDeleteDataView,
}) => {
  const hasManagedTransforms = useMemo(() => items.some((t) => isManagedTransform(t)), [items]);
  const isBulkAction = items.length > 1;

  const bulkDeleteModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalTitle',
    {
      defaultMessage: 'Delete {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items.length },
    }
  );
  const deleteModalTitle = i18n.translate('xpack.transform.transformList.deleteModalTitle', {
    defaultMessage: 'Delete {transformId}?',
    values: { transformId: items[0] && items[0].config.id },
  });
  const bulkDeleteModalContent = (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        {hasManagedTransforms ? (
          <p>
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.transform.transformList.deleteManagedBulkTransformsDescription"
                  defaultMessage="At least one of these transforms was deployed as part of a module; deleting them might impact other parts of the product."
                />
              </EuiText>
            </>
          </p>
        ) : null}

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
                'xpack.transform.actionDeleteTransform.bulkDeleteDestDataViewTitle',
                {
                  defaultMessage: 'Delete destination data views',
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
              disabled={userCanDeleteDataView === false}
            />
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const deleteModalContent = (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        {hasManagedTransforms ? (
          <p>
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.transform.transformList.deleteManagedTransformDescription"
                  defaultMessage="This transform was deployed as part of a module; deleting it might impact other parts of the product."
                />
              </EuiText>
            </>
          </p>
        ) : null}

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
                'xpack.transform.actionDeleteTransform.deleteDestDataViewTitle',
                {
                  defaultMessage: 'Delete data view {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
              disabled={userCanDeleteDataView === false}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );

  return (
    <EuiConfirmModal
      data-test-subj="transformDeleteModal"
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
  );
};
