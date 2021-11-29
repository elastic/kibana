/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

import { useBasePath } from '../../lib/kibana';

export const PopoverDescriptionComponent = () => (
  <EuiText size="s">
    <FormattedMessage
      id="xpack.securitySolution.components.mlPopup.anomalyDetectionDescription"
      defaultMessage="Run any of the Machine Learning jobs below to prepare for creating detection rules that produce alerts for detected anomalies, and to view anomalous events throughout the Security application. We’ve provided a collection of common detection jobs to get you started. If you wish to add your own custom ML jobs, create and add them to the “Security” group from the {machineLearning} application."
      values={{
        machineLearning: (
          <EuiLink href={`${useBasePath()}/app/ml`} target="_blank">
            <FormattedMessage
              id="xpack.securitySolution.components.mlPopup.machineLearningLink"
              defaultMessage="Machine Learning"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);
PopoverDescriptionComponent.displayName = 'PopoverDescriptionComponent';

export const PopoverDescription = React.memo(PopoverDescriptionComponent);

PopoverDescription.displayName = 'PopoverDescription';
