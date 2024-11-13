/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import React from 'react';
import type { Severity } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { severityOptions } from '../step_about_rule/data';
import * as i18n from './translations';

const describedByIds = ['detectionEngineStepAboutRuleSeverity'];

interface DefaultSeverityProps {
  value: Severity;
  onChange: (newValue: Severity) => void;
}

export function DefaultSeverity({ value, onChange }: DefaultSeverityProps) {
  return (
    <EuiFlexItem>
      <EuiFormRow
        label={<DefaultSeverityLabel />}
        fullWidth
        data-test-subj="detectionEngineStepAboutRuleSeverity"
        describedByIds={describedByIds}
      >
        <EuiSuperSelect
          fullWidth={false}
          disabled={false}
          valueOfSelected={value}
          onChange={onChange}
          options={severityOptions}
          data-test-subj="select"
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function DefaultSeverityLabel() {
  return (
    <div>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{i18n.SEVERITY}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size={'xs'}>{i18n.SEVERITY_DESCRIPTION}</EuiText>
    </div>
  );
}
