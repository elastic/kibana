/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Control, UseFormWatch } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

export interface Props {
  control: Control<CreateSLOInput>;
  watch: UseFormWatch<CreateSLOInput>;
}

export function ApmLatencyIndicatorTypeForm({ control, watch }: Props) {
  return <EuiFlexGroup direction="column" gutterSize="l" />;
}
