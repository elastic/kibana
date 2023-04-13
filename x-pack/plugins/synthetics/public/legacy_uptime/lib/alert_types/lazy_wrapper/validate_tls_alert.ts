/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { TLSParamsType } from '../../../../../common/runtime_types/alerts/tls';

export function validateTLSAlertParams(ruleParams: any): ValidationResult {
  const errors: Record<string, any> = {};
  const decoded = TLSParamsType.decode(ruleParams);

  if (!isRight(decoded)) {
    return {
      errors: {
        typeCheckFailure: 'Provided parameters do not conform to the expected type.',
        typeCheckParsingMessage: PathReporter.report(decoded),
      },
    };
  }

  return { errors };
}
