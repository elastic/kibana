/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import { useDatasetQualityDetailsState } from '../../../../../hooks';
import { CreateEditComponentTemplateLink } from './component_template_link';
import { CreateEditPipelineLink } from './pipeline_link';
import { otherMitigationsLoadingAriaText } from '../../../../../../common/translations';

export function ManualMitigations() {
  const { integrationDetails, loadingState, dataStreamSettings } = useDatasetQualityDetailsState();
  const isIntegrationPresentInSettings = dataStreamSettings?.integration;
  const isIntegration = !!integrationDetails?.integration;
  const { dataStreamSettingsLoading, integrationDetailsLoadings } = loadingState;

  const hasIntegrationCheckCompleted =
    !dataStreamSettingsLoading &&
    ((isIntegrationPresentInSettings && !integrationDetailsLoadings) ||
      !isIntegrationPresentInSettings);

  return (
    <EuiSkeletonRectangle
      isLoading={!hasIntegrationCheckCompleted}
      contentAriaLabel={otherMitigationsLoadingAriaText}
      width="100%"
      height={300}
      borderRadius="none"
    >
      <CreateEditComponentTemplateLink isIntegration={isIntegration} />
      <EuiSpacer size="s" />
      <CreateEditPipelineLink isIntegration={isIntegration} />
    </EuiSkeletonRectangle>
  );
}
