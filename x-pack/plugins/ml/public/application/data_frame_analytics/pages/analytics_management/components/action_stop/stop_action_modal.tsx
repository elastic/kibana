/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { StopAction } from './use_stop_action';

export const StopActionModal: FC<StopAction> = ({ closeModal, item, forceStopAndCloseModal }) => {
  return (
    <>
      {item !== undefined && (
        <EuiConfirmModal
          title={i18n.translate('xpack.ml.dataframe.analyticsList.forceStopModalTitle', {
            defaultMessage: 'Force this job to stop?',
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
              defaultMessage="{analyticsId} is in a failed state. You must stop the job and fix the failure."
              values={{ analyticsId: item.config.id }}
            />
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
