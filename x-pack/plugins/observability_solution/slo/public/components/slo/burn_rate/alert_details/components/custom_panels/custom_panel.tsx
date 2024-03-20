/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOResponse } from '@kbn/slo-schema';

export function CustomAlertDetailsPanel({ slo }: { slo?: GetSLOResponse }) {
  switch (slo?.indicator.type) {
    default:
      return null;
  }
}
