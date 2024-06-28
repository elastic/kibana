/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '@kbn/ml-category-validator';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  validationResults: FieldValidationResults | null;
}

export const FieldValidationCallout: FC<Props> = ({ validationResults }) => {
  if (validationResults === null) {
    return null;
  }

  if (validationResults.overallValidStatus === CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      title={i18n.translate('xpack.aiops.logCategorization.fieldValidationTitle', {
        defaultMessage: 'The selected field is possibly not suitable for pattern analysis',
      })}
    >
      {validationResults.validationChecks
        .filter((check) => check.valid !== CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID)
        .map((check) => (
          <div key={check.id}>{check.message}</div>
        ))}
    </EuiCallOut>
  );
};
