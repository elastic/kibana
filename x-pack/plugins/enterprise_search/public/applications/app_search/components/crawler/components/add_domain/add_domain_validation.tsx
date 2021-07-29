/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { AddDomainLogic } from './add_domain_logic';
import { ValidationStepPanel } from './validation_step_panel';

export const AddDomainValidation: React.FC = () => {
  const { addDomainFormInputValue, domainValidationResult } = useValues(AddDomainLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.initialValidation}
            label="Initial Validation"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.networkConnectivity}
            label="Network Connectivity"
            action={
              <EuiButton size="s" href={addDomainFormInputValue} target="_blank">
                Test URL in the browser
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.indexingRestrictions}
            label="Indexing Restrictions"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.contentVerification}
            label="Content Verification"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
