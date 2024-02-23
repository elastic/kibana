/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';

export function InvalidIndicator({ title, minHeight }: { title: ReactNode; minHeight: number }) {
  return (
    <EuiFlexItem>
      {title}
      <EuiFormRow fullWidth>
        <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight }}>
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            style={{ minHeight: minHeight - 20 }}
          >
            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.observability.slo.sloEdit.dataPreviewChart.explanationMessage',
                {
                  defaultMessage:
                    'Fill the indicator fields to see visualisation of the current metrics',
                }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFormRow>
    </EuiFlexItem>
  );
}
