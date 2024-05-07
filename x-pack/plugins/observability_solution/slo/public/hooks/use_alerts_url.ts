/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityPaths } from '@kbn/observability-plugin/common';
import rison from '@kbn/rison';
import { useKibana } from '../utils/kibana_react';

export const useAlertsUrl = () => {
  const { basePath } = useKibana().services.http;

  const kuery = 'alert.attributes.alertTypeId:("slo.rules.burnRate")';

  return `${basePath.prepend(observabilityPaths.alerts)}?_a=${rison.encode({
    kuery,
    rangeFrom: 'now-24h',
    rangeTo: 'now',
  })}`;
};
