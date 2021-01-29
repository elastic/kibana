/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';

import { FlexGroupAlignItems } from '@elastic/eui/src/components/flex/flex_group';

interface ViewContentHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  alignItems?: FlexGroupAlignItems;
  titleSize?: 's' | 'm' | 'l';
}

export const ViewContentHeader: React.FC<ViewContentHeaderProps> = ({
  title,
  titleSize = 'm',
  description,
  action,
  alignItems = 'center',
}) => {
  let titleElement;

  switch (titleSize) {
    case 's':
      titleElement = <h4>{title}</h4>;
      break;
    case 'l':
      titleElement = <h2>{title}</h2>;
      break;
    default:
      titleElement = <h3>{title}</h3>;
      break;
  }

  return (
    <>
      <EuiFlexGroup alignItems={alignItems} justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size={titleSize}>{titleElement}</EuiTitle>
          <EuiSpacer size="s" />
          {description && (
            <EuiText grow={false} color="subdued">
              <p>{description}</p>
            </EuiText>
          )}
        </EuiFlexItem>
        {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
};
