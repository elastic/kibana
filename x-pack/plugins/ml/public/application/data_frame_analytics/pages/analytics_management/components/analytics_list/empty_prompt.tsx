/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  disabled: boolean;
  isManagementTable: boolean;
  onCreateFirstJobClick: () => void;
}

export const AnalyticsEmptyPrompt: FC<Props> = ({
  disabled,
  isManagementTable,
  onCreateFirstJobClick,
}) => (
  <EuiEmptyPrompt
    iconType="createAdvancedJob"
    title={
      <h2>
        {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptTitle', {
          defaultMessage: 'Create your first data frame analytics job',
        })}
      </h2>
    }
    actions={
      !isManagementTable
        ? [
            <EuiButton
              onClick={onCreateFirstJobClick}
              isDisabled={disabled}
              color="primary"
              iconType="plusInCircle"
              fill
              data-test-subj="mlAnalyticsCreateFirstButton"
            >
              {i18n.translate('xpack.ml.dataFrame.analyticsList.emptyPromptButtonText', {
                defaultMessage: 'Create job',
              })}
            </EuiButton>,
          ]
        : []
    }
    data-test-subj="mlNoDataFrameAnalyticsFound"
  />
);
