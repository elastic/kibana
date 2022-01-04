/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { StartAction } from './use_start_action';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

export const StartActionModal: FC<StartAction> = ({ closeModal, items, startAndCloseModal }) => {
  const hasManagedTransforms = useMemo(() => items.some((t) => isManagedTransform(t)), [items]);

  const isBulkAction = items.length > 1;

  const bulkStartModalTitle = i18n.translate('xpack.transform.transformList.bulkStartModalTitle', {
    defaultMessage: 'Start {count} {count, plural, one {transform} other {transforms}}?',
    values: { count: items && items.length },
  });
  const startModalTitle = i18n.translate('xpack.transform.transformList.startModalTitle', {
    defaultMessage: 'Start {transformId}?',
    values: { transformId: items[0] && items[0].config.id },
  });

  return (
    <EuiConfirmModal
      data-test-subj="transformStartModal"
      title={isBulkAction === true ? bulkStartModalTitle : startModalTitle}
      onCancel={closeModal}
      onConfirm={startAndCloseModal}
      cancelButtonText={i18n.translate('xpack.transform.transformList.startModalCancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.transform.transformList.startModalStartButton', {
        defaultMessage: 'Start',
      })}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="primary"
    >
      <p>
        {hasManagedTransforms ? (
          <>
            <FormattedMessage
              id="xpack.transform.transformList.startManagedTransformsDescription"
              defaultMessage="{transformsCount, plural, one {This transform was} other {At least one of these transforms was}} deployed as part of a module; starting {transformsCount, plural, one {it} other {them}} might impact other parts of the product."
              values={{
                transformsCount: items.length,
              }}
            />
            &nbsp;
          </>
        ) : null}

        {i18n.translate('xpack.transform.transformList.startModalBody', {
          defaultMessage:
            'A transform increases search and indexing load in your cluster. If excessive load is experienced, stop the transform.',
        })}
      </p>
    </EuiConfirmModal>
  );
};
