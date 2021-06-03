/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ISOLATE_HOST = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.isolateHost',
  {
    defaultMessage: 'Isolate host',
  }
);

export const UNISOLATE_HOST = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.unisolateHost',
  {
    defaultMessage: 'Unisolate host',
  }
);

export const CASES_ASSOCIATED_WITH_ALERT = (caseCount: number): string =>
  i18n.translate(
    'xpack.securitySolution.endpoint.hostIsolation.isolateHost.casesAssociatedWithAlert',
    {
      defaultMessage: ' {caseCount, plural, one {case} other {cases}} associated with the rule ',
      values: { caseCount },
    }
  );

export const RETURN_TO_ALERT_DETAILS = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.returnToAlertDetails',
  { defaultMessage: 'Return to alert details' }
);
