/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FlexGroupAlignItems } from '@elastic/eui/src/components/flex/flex_group';

interface ViewContentHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  action?: React.ReactNode;
  alignItems?: FlexGroupAlignItems;
  titleSize?: 's' | 'm' | 'l';
}

export const ViewContentHeader: React.FC<ViewContentHeaderProps> = ({
  title,
  titleSize = 'm',
  headingLevel = 2,
  description,
  action,
  alignItems = 'center',
}) => {
  let titleElement;

  switch (headingLevel) {
    case 1:
      titleElement = <h1>{title}</h1>;
      break;
    case 2:
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
