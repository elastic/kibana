/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FieldHook, UseField } from '../../../../../../../shared_imports';
import type { Severity } from '../../../../../../../../common/api/detection_engine';
import { DefaultSeverity } from '../../../../../../rule_creation_ui/components/severity_mapping/default_severity';

export function SeverityEdit(): JSX.Element {
  return <UseField path="severity" component={SeverityEditField} />;
}

interface SeverityEditFieldProps {
  field: FieldHook<Severity>;
}

function SeverityEditField({ field }: SeverityEditFieldProps) {
  const { value, setValue } = field;

  return <DefaultSeverity value={value} onChange={setValue} />;
}
