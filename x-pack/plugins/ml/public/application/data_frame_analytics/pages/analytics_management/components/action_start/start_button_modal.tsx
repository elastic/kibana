/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { StartAction } from './use_start_action';

export const StartButtonModal: FC<StartAction> = ({ closeModal, item, startAndCloseModal }) => {
  return (
    <>
      {item !== undefined && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.analyticsList.startModalTitle', {
              defaultMessage: 'Start {analyticsId}',
              values: { analyticsId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={startAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.startModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.startModalStartButton',
              {
                defaultMessage: 'Start',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="primary"
          >
            <p>
              {i18n.translate('xpack.ml.dataframe.analyticsList.startModalBody', {
                defaultMessage:
                  'A data frame analytics job will increase search and indexing load in your cluster. Please stop the analytics job if excessive load is experienced. Are you sure you want to start this analytics job?',
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
