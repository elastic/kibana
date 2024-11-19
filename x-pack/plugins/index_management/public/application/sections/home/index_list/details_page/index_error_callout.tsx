/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NormalizedField } from '../../../../components/mappings_editor/types';

interface IndexErrorCalloutProps {
  errors: Array<{
    field: NormalizedField;
    error: string;
  }>;
}

export const IndexErrorCallout = ({ errors }: IndexErrorCalloutProps) => {
  const [showErrors, setShowErrors] = useState(false);
  return (
    <EuiCallOut
      data-test-subj="indexErrorCallout"
      color="danger"
      iconType="error"
      title={i18n.translate('xpack.idxMgmt.indexOverview.indexErrors.title', {
        defaultMessage: 'Index has errors',
      })}
    >
      {showErrors && (
        <>
          <p>
            {i18n.translate('xpack.idxMgmt.indexOverview.indexErrors.body', {
              defaultMessage: 'Found errors in the following fields:',
            })}
            {errors.map(({ field, error }) => (
              <li key={field.path.join('.')}>
                <strong>{field.path.join('.')}</strong>: {error}
              </li>
            ))}
          </p>
          <EuiButton color="danger" onClick={() => setShowErrors(false)}>
            {i18n.translate('xpack.idxMgmt.indexOverview.indexErrors.hideErrorsLabel', {
              defaultMessage: 'Hide full error',
            })}
          </EuiButton>
        </>
      )}
      {!showErrors && (
        <EuiButton color="danger" onClick={() => setShowErrors(true)}>
          {i18n.translate('xpack.idxMgmt.indexOverview.indexErrors.showErrorsLabel', {
            defaultMessage: 'Show full error',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
