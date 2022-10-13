/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCreateAndNavigateToMlLink } from '../../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../../common/constants/locator';

export function NewJobButton() {
  const buttonEnabled = checkPermission('canCreateJob') && mlNodesAvailable();
  const newJob = useCreateAndNavigateToMlLink(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX);

  return (
    <EuiButton
      data-test-subj="mlCreateNewJobButton"
      onClick={newJob}
      size="s"
      disabled={buttonEnabled === false}
      fill
      iconType="plusInCircle"
    >
      <FormattedMessage
        id="xpack.ml.jobsList.createNewJobButtonLabel"
        defaultMessage="Create job"
      />
    </EuiButton>
  );
}
