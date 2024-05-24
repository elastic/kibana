/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { ContinueButton } from '../Buttons/ContinueButton';
import { GoBackButton } from '../Buttons/GoBackButton';
import { RoutePaths } from '../../constants/routePaths';

export const ViewResultsButtons = () => {
  return (
    <EuiFlexGroup>
      <ContinueButton
        continuePath={RoutePaths.INTEGRATION_BUILDER_BUILD_PATH}
        isDisabled={false}
        currentStep="integrationBuilderStep5"
        completeStep="integrationBuilderStep4"
      />
      <GoBackButton path={RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH} />
    </EuiFlexGroup>
  );
};
