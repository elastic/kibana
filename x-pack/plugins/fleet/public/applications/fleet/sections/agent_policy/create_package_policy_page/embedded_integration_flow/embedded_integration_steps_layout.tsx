/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { Error } from '../../../../components';

import type { EmbeddedIntegrationStepsLayoutProps } from './types';

export const EmbeddedIntegrationStepsLayout: React.FunctionComponent<
  EmbeddedIntegrationStepsLayoutProps
> = (props) => {
  const { steps, currentStep, error } = props;

  if (error) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={error}
      />
    );
  }

  const StepComponent = steps[currentStep].component;

  return <StepComponent {...props} />;
};
