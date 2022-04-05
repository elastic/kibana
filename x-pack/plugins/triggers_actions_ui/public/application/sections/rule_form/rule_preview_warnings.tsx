/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { DiagnosticResult } from '../../../../../alerting/common';

interface RulePreviewWarningsProps {
  errorsAndWarnings: DiagnosticResult[];
}

export const RulePreviewWarnings = ({ errorsAndWarnings }: RulePreviewWarningsProps) => {
  const empty = !errorsAndWarnings || errorsAndWarnings.length === 0;
  const errors = errorsAndWarnings.filter((item: DiagnosticResult) => item.type === 'error');
  const warnings = errorsAndWarnings.filter((item: DiagnosticResult) => item.type === 'warning');

  return (
    <>
      <EuiSpacer size="m" />
      {empty ? (
        <EuiCallOut
          title="No errors or warnings while previewing your rule!"
          iconType="iInCircle"
          size="s"
        />
      ) : (
        <>
          <h5>The following errors were encountered while previewing your rule:</h5>
          <EuiSpacer size="m" />
          {errors.map((error: DiagnosticResult) => {
            return (
              <>
                <EuiCallOut title={error.name} color="danger" iconType="alert" size="s">
                  <p>{error.message}</p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            );
          })}
          <h5>The following warnings were encountered while previewing your rule:</h5>
          <EuiSpacer size="m" />
          {warnings.map((warning: DiagnosticResult) => {
            return (
              <>
                <EuiCallOut title={warning.name} color="warning" iconType="alert" size="s">
                  <p>{warning.message}</p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            );
          })}
        </>
      )}
    </>
  );
};
