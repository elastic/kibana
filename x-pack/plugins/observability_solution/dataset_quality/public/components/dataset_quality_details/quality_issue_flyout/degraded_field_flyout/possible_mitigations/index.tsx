/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldMappingLimit } from './field_limit/field_mapping_limit';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../../../hooks';
import { PossibleMitigations } from '../../possible_mitigations';

export function PossibleDegradedFieldMitigations() {
  const { degradedFieldAnalysis } = useDegradedFields();
  const { integrationDetails } = useDatasetQualityDetailsState();
  const isIntegration = Boolean(integrationDetails?.integration);

  return (
    <PossibleMitigations>
      {degradedFieldAnalysis?.isFieldLimitIssue && (
        <>
          <FieldMappingLimit isIntegration={isIntegration} />
          <EuiSpacer size="m" />
        </>
      )}
    </PossibleMitigations>
  );
}
