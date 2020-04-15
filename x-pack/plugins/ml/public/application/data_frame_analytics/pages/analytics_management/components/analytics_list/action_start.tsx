/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { startAnalytics } from '../../services/analytics_service';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameAnalyticsListRow, isCompletedAnalyticsJob } from './common';

interface StartActionProps {
  item: DataFrameAnalyticsListRow;
}

export const StartAction: FC<StartActionProps> = ({ item }) => {
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    setModalVisible(false);
    startAnalytics(item);
  };
  const openModal = () => setModalVisible(true);

  const buttonStartText = i18n.translate('xpack.ml.dataframe.analyticsList.startActionName', {
    defaultMessage: 'Start',
  });

  // Disable start for analytics jobs which have completed.
  const completeAnalytics = isCompletedAnalyticsJob(item.stats);

  let startButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canStartStopDataFrameAnalytics || completeAnalytics}
      iconType="play"
      onClick={openModal}
      aria-label={buttonStartText}
      data-test-sub="mlAnalyticsJobStartButton"
    >
      {buttonStartText}
    </EuiButtonEmpty>
  );

  if (!canStartStopDataFrameAnalytics || completeAnalytics) {
    startButton = (
      <EuiToolTip
        position="top"
        content={
          !canStartStopDataFrameAnalytics
            ? createPermissionFailureMessage('canStartStopDataFrameAnalytics')
            : i18n.translate('xpack.ml.dataframe.analyticsList.completeBatchAnalyticsToolTip', {
                defaultMessage:
                  '{analyticsId} is a completed analytics job and cannot be restarted.',
                values: { analyticsId: item.config.id },
              })
        }
      >
        {startButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {startButton}
      {isModalVisible && (
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
    </Fragment>
  );
};
