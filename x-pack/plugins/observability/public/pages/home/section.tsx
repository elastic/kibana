/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

export interface ISection {
  id: string;
  title: string;
  icon: string;
  description: string;
  href?: string;
  target?: '_blank';
}

export const Section = ({ section }: { section: ISection }) => {
  const { icon, title, description } = section;

  return (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="l" color="default" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs" className="title">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {description && (
            <EuiText size="s" color="default">
              {description}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
