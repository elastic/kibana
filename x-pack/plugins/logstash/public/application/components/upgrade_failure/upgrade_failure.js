/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';
import { UpgradeFailureTitle } from './upgrade_failure_title';
import { UpgradeFailureActions } from './upgrade_failure_actions';
import { UPGRADE_FAILURE } from './constants';

export function UpgradeFailure({ isNewPipeline, isManualUpgrade, onClose, onRetry }) {
  const titleText = isManualUpgrade
    ? UPGRADE_FAILURE.TITLE.IS_MANUAL_UPGRADE
    : UPGRADE_FAILURE.TITLE.NOT_MANUAL_UPGRADE;

  const messageText = isNewPipeline
    ? UPGRADE_FAILURE.MESSAGE.IS_NEW_PIPELINE
    : UPGRADE_FAILURE.MESSAGE.NOT_NEW_PIPELINE;

  const upgradeButtonText = isManualUpgrade
    ? UPGRADE_FAILURE.UPGRADE_BUTTON_TEXT.IS_MANUAL_UPGRADE
    : UPGRADE_FAILURE.UPGRADE_BUTTON_TEXT.NOT_MANUAL_UPGRADE;

  return (
    <div data-test-subj="pipelineEdit upgradeFailure" style={{ minHeight: '100vh' }}>
      <EuiPageContent>
        <EuiEmptyPrompt
          actions={
            <UpgradeFailureActions
              onClose={onClose}
              onRetry={onRetry}
              upgradeButtonText={upgradeButtonText}
            />
          }
          title={<UpgradeFailureTitle titleText={titleText} />}
          body={<p style={{ textAlign: 'left' }}>{messageText}</p>}
        />
      </EuiPageContent>
    </div>
  );
}
