/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';

const DEFAULT_QUERY = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};
const DEFAULT_QUERY_STRING = JSON.stringify(DEFAULT_QUERY, null, 2);

export const ResetQueryButton: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const closeModal = () => setConfirmModalVisible(false);
  const showModal = () => setConfirmModalVisible(true);

  function resetDatafeed() {
    jobCreator.query = DEFAULT_QUERY;
    jobCreatorUpdate();
    closeModal();
  }
  return (
    <>
      {confirmModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.newJob.wizard.datafeedStep.resetQueryConfirm.title', {
              defaultMessage: 'Reset datafeed query',
            })}
            onCancel={closeModal}
            onConfirm={resetDatafeed}
            cancelButtonText={i18n.translate(
              'xpack.ml.newJob.wizard.datafeedStep.resetQueryConfirm.cancel',
              { defaultMessage: 'Cancel' }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.newJob.wizard.datafeedStep.resetQueryConfirm.confirm',
              { defaultMessage: 'Confirm' }
            )}
            defaultFocusedButton="confirm"
          >
            <FormattedMessage
              id="xpack.ml.newJob.wizard.datafeedStep.resetQueryConfirm.description"
              defaultMessage="Set the datafeed query to be the default."
            />

            <EuiSpacer size="s" />

            <EuiCodeBlock language="js" fontSize="m" paddingSize="s">
              {DEFAULT_QUERY_STRING}
            </EuiCodeBlock>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}

      <EuiButtonEmpty size="s" onClick={showModal}>
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.resetQueryButton"
          defaultMessage="Reset datafeed query to default"
        />
      </EuiButtonEmpty>
    </>
  );
};
