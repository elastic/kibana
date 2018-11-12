/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
export const PhaseErrorMessage = ({ isShowingErrors }) => {
  return isShowingErrors ? (
    <EuiTextColor color="danger">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.idxLifecycleMgmt.editPolicy.phaseErrorMessage"
            defaultMessage="This phase contains errors"
          />
        </p>
      </EuiText>
    </EuiTextColor>
  ) : null;
};