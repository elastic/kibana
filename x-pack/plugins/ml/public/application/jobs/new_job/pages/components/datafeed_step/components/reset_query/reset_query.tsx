/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiConfirmModal, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { getDefaultDatafeedQuery } from '../../../../../utils/new_job_utils';

export const ResetQueryButton: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [defaultQueryString] = useState(JSON.stringify(getDefaultDatafeedQuery(), null, 2));

  const closeModal = () => setConfirmModalVisible(false);
  const showModal = () => setConfirmModalVisible(true);

  function resetDatafeed() {
    jobCreator.query = getDefaultDatafeedQuery();
    jobCreatorUpdate();
    closeModal();
  }
  return (
    <>
      {confirmModalVisible && (
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
            {defaultQueryString}
          </EuiCodeBlock>
        </EuiConfirmModal>
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
