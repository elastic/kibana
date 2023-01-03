/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetails(props: Props) {
  const { slo } = props;
  return <pre data-test-subj="sloDetails">{JSON.stringify(slo, null, 2)}</pre>;
}
