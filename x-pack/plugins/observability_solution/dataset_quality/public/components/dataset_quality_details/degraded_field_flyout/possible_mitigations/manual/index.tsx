/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useDatasetQualityDetailsState } from '../../../../../hooks';
import { CreateEditComponentTemplateLink } from './component_template_link';
import { CreateEditPipelineLink } from './pipeline_link';

export function ManualMitigations() {
  const { integrationDetails } = useDatasetQualityDetailsState();
  const isIntegration = !!integrationDetails?.integration;
  return (
    <>
      <CreateEditComponentTemplateLink isIntegration={isIntegration} />
      <EuiSpacer size="s" />
      <CreateEditPipelineLink isIntegration={isIntegration} />
    </>
  );
}
