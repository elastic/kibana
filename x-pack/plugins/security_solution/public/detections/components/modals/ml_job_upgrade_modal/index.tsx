/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { MlSummaryJob } from '@kbn/ml-plugin/common';
import React, { memo } from 'react';
import * as i18n from './translations';

export interface MlJobUpgradeModalProps {
  jobs: MlSummaryJob[];
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onConfirm?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const MlJobUpgradeModalComponent = ({ jobs, onCancel, onConfirm }: MlJobUpgradeModalProps) => {
  return (
    <EuiConfirmModal
      title={i18n.ML_JOB_UPGRADE_MODAL_TITLE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.ML_JOB_UPGRADE_MODAL_CANCEL}
      confirmButtonText={i18n.ML_JOB_UPGRADE_MODAL_CONFIRM}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <i18n.MlJobUpgradeModalBody />
      {i18n.ML_JOB_UPGRADE_MODAL_AFFECTED_JOBS}
      <ul>
        {jobs.map((j) => {
          return <li key={j.id}>{j.id}</li>;
        })}
      </ul>
    </EuiConfirmModal>
  );
};

export const MlJobUpgradeModal = memo(MlJobUpgradeModalComponent);
