/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GetSLOResponse } from '@kbn/slo-schema';
import { CustomKqlPanels } from './custom_kql/custom_kql_panels';
import { BurnRateAlert, BurnRateRule } from '../../alert_details_app_section';

interface Props {
  alert: BurnRateAlert;
  rule: BurnRateRule;
  slo?: GetSLOResponse;
}

export function CustomAlertDetailsPanel({ slo, alert, rule }: Props) {
  switch (slo?.indicator.type) {
    case 'sli.kql.custom':
      return <CustomKqlPanels slo={slo} alert={alert} rule={rule} />;
    default:
      return null;
  }
}
