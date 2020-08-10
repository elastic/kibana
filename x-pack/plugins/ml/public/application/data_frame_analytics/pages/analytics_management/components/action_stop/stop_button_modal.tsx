/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiConfirmModal, EuiOverlayMask, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { ForceStopAction } from './use_force_stop_action';

export const StopButtonModal: FC<ForceStopAction> = ({
  closeModal,
  item,
  forceStopAndCloseModal,
}) => {
  return (
    <>
      {item !== undefined && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.analyticsList.forceStopModalTitle', {
              defaultMessage: 'Force stop {analyticsId}',
              values: { analyticsId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={forceStopAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.forceStopModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.analyticsList.forceStopModalStartButton',
              {
                defaultMessage: 'Stop',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="primary"
          >
            <p>
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsList.forceStopModalBody"
                defaultMessage="The analytics job is in the failed state, do you want to force stop {analyticsId}?"
                values={{ analyticsId: item.config.id }}
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
