/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import {
  EuiAccordion,
  EuiIcon,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  type EuiAccordionProps,
} from '@elastic/eui';

interface AccordionWithIconProps
  extends Omit<EuiAccordionProps, 'buttonContent' | 'buttonProps' | 'borders' | 'paddingSize'> {
  title: string;
  iconType: string;
}
export const AccordionWithIcon: FunctionComponent<AccordionWithIconProps> = ({
  title,
  iconType,
  children,
  ...rest
}) => {
  return (
    <EuiAccordion
      {...rest}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={{ marginLeft: 8 }}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs" css={rest.isDisabled ? { color: 'inherit' } : undefined}>
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{ paddingSize: 'l' }}
      borders="horizontal"
      paddingSize="none"
    >
      <div css={{ paddingLeft: 36, paddingBottom: 24 }}>{children}</div>
    </EuiAccordion>
  );
};
