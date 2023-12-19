/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

export function FieldsList({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ fieldTitle: string; fieldValue: ReactNode }>;
}) {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiTitle size="s">
        <span>{title}</span>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="none">
        {fields.map(({ fieldTitle, fieldValue }, index) => (
          <Fragment key={index + fieldTitle}>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <EuiTitle size="xxs">
                  <span>{fieldTitle}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={4}>{fieldValue}</EuiFlexItem>
            </EuiFlexGroup>

            {index < fields.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
