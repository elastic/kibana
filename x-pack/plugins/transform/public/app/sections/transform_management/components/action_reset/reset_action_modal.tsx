/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { ResetAction } from './use_reset_action';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';
import { ManagedTransformsWarningCallout } from '../managed_transforms_callout/managed_transforms_callout';

export const ResetActionModal: FC<ResetAction> = ({
  closeModal,
  resetAndCloseModal,
  items,
  shouldForceReset,
}) => {
  const hasManagedTransforms = useMemo(() => items.some((t) => isManagedTransform(t)), [items]);
  const isBulkAction = items.length > 1;

  const bulkResetModalTitle = i18n.translate('xpack.transform.transformList.bulkResetModalTitle', {
    defaultMessage: 'Reset {count} {count, plural, one {transform} other {transforms}}?',
    values: { count: items.length },
  });
  const resetModalTitle = i18n.translate('xpack.transform.transformList.resetModalTitle', {
    defaultMessage: 'Reset {transformId}?',
    values: { transformId: items[0] && items[0].config.id },
  });
  const bulkResetModalContent = (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        {hasManagedTransforms ? (
          <>
            <ManagedTransformsWarningCallout
              count={items.length}
              action={i18n.translate(
                'xpack.transform.transformList.resetManagedTransformDescription',
                { defaultMessage: 'resetting' }
              )}
            />
            <EuiSpacer />
          </>
        ) : null}
      </EuiFlexGroup>
    </>
  );

  const resetModalContent = (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        {hasManagedTransforms ? (
          <>
            <ManagedTransformsWarningCallout
              count={1}
              action={i18n.translate(
                'xpack.transform.transformList.resetManagedTransformDescription',
                { defaultMessage: 'resetting' }
              )}
            />
            <EuiSpacer />
          </>
        ) : null}
      </EuiFlexGroup>
    </>
  );

  return (
    <EuiConfirmModal
      data-test-subj="transformResetModal"
      title={isBulkAction === true ? bulkResetModalTitle : resetModalTitle}
      onCancel={closeModal}
      onConfirm={resetAndCloseModal}
      cancelButtonText={i18n.translate('xpack.transform.transformList.resetModalCancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.transform.transformList.resetModalResetButton', {
        defaultMessage: 'Reset',
      })}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="danger"
    >
      {isBulkAction ? bulkResetModalContent : resetModalContent}
    </EuiConfirmModal>
  );
};
