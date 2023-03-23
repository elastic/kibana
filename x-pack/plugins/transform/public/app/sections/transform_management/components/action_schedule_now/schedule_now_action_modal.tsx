/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';
import { ScheduleNowAction } from './use_schedule_now_action';

export const ScheduleNowActionModal: FC<ScheduleNowAction> = ({
  closeModal,
  items,
  scheduleNowAndCloseModal,
}) => {
  const isBulkAction = items.length > 1;

  const bulkScheduleNowModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkScheduleNowModalTitle',
    {
      defaultMessage: 'Schedule {count} {count, plural, one {transform} other {transforms}} now?',
      values: { count: items && items.length },
    }
  );
  const scheduleNowModalTitle = i18n.translate(
    'xpack.transform.transformList.scheduleNowModalTitle',
    {
      defaultMessage: 'Schedule {transformId} now?',
      values: { transformId: items[0] && items[0].config.id },
    }
  );

  return (
    <EuiConfirmModal
      data-test-subj="transformScheduleNowModal"
      title={isBulkAction === true ? bulkScheduleNowModalTitle : scheduleNowModalTitle}
      onCancel={closeModal}
      onConfirm={scheduleNowAndCloseModal}
      cancelButtonText={i18n.translate(
        'xpack.transform.transformList.scheduleNowModalCancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.transform.transformList.scheduleNowModalScheduleNowButton',
        {
          defaultMessage: 'Schedule now',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="primary"
    >
      <p>
        {i18n.translate('xpack.transform.transformList.scheduleNowModalBody', {
          defaultMessage:
            'A transform increases search and indexing load in your cluster. If excessive load is experienced, stop the transform.',
        })}
      </p>
    </EuiConfirmModal>
  );
};
