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
  EuiSkeletonTitle,
  EuiSkeletonText,
} from '@elastic/eui';

export function FieldsList({
  title,
  fields,
  actionsMenu: ActionsMenu,
}: {
  title: string;
  fields: Array<{ fieldTitle: string; fieldValue: ReactNode }>;
  actionsMenu?: ReactNode;
}) {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiTitle size="s">
          <span>{title}</span>
        </EuiTitle>
        <EuiFlexItem grow={false}>{ActionsMenu}</EuiFlexItem>
      </EuiFlexGroup>
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
              <EuiFlexItem grow={4} data-test-subj="datasetQualityFlyoutFieldValue">
                {fieldValue}
              </EuiFlexItem>
            </EuiFlexGroup>

            {index < fields.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function FieldsListLoading() {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiSkeletonTitle size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiSkeletonText size="m" lines={1} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiSkeletonText lines={1} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiSkeletonText size="m" lines={1} />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiSkeletonText lines={1} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
