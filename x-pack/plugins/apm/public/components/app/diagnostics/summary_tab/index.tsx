/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ApmIntegrationPackageStatus } from './apm_integration_package_status';
import { IndexTemplatesStatus } from './index_templates_status';
import { FieldMappingStatus } from './field_mapping_status';
import { DataStreamsStatus } from './data_streams_status';

export function DiagnosticsSummary() {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <ApmIntegrationPackageStatus />
      </EuiFlexItem>
      <EuiFlexItem>
        <DataStreamsStatus />
      </EuiFlexItem>
      <EuiFlexItem>
        <IndexTemplatesStatus />
      </EuiFlexItem>
      <EuiFlexItem>
        <FieldMappingStatus />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
