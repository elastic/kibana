/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ManualMitigations } from './manual';
import { FieldMappingLimit } from './field_limit/field_mapping_limit';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../../hooks';
import { PossibleMitigationTitle } from './title';

export function PossibleMitigations() {
  const { degradedFieldAnalysis, isAnalysisInProgress } = useDegradedFields();
  const { integrationDetails } = useDatasetQualityDetailsState();
  const areIntegrationAssetsAvailable = !!integrationDetails?.integration?.areAssetsAvailable;

  return (
    !isAnalysisInProgress && (
      <div>
        <PossibleMitigationTitle />
        <EuiSpacer size="m" />
        {degradedFieldAnalysis?.isFieldLimitIssue && (
          <>
            <FieldMappingLimit areIntegrationAssetsAvailable={areIntegrationAssetsAvailable} />
            <EuiSpacer size="m" />
          </>
        )}
        <ManualMitigations />
      </div>
    )
  );
}
