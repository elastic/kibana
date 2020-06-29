/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';

import { FlexGroupAlignItems } from '@elastic/eui/src/components/flex/flex_group';

interface IViewContentHeaderProps {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  alignItems?: FlexGroupAlignItems;
}

const preventWidows = (str: string) => {
  const words = str.split(/\s+/);
  const last2 = words.splice(-2).join('\u00A0');
  return `${words.join(' ')} ${last2}`;
};

export const ViewContentHeader: React.FC<IViewContentHeaderProps> = ({
  title,
  description = null,
  action = null,
  alignItems = 'center',
}) => (
  <div className="view-content-header">
    <EuiFlexGroup alignItems={alignItems} justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
        {description && (
          <EuiText grow={false}>
            <p className="view-content-header__description">{preventWidows(description)}</p>
          </EuiText>
        )}
      </EuiFlexItem>
      {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
    </EuiFlexGroup>
    <EuiSpacer />
  </div>
);
