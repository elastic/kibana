/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { startCase } from 'lodash';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';

import { SourceIcon } from '../../../../components/shared/source_icon';

interface AddSourceHeaderProps {
  name: string;
  serviceType: string;
  categories: string[];
}

export const AddSourceHeader: React.FC<AddSourceHeaderProps> = ({
  name,
  serviceType,
  categories,
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        alignItems="flexStart"
        justifyContent="center"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <SourceIcon
            serviceType={serviceType}
            fullBleed
            name={name}
            className="adding-a-source__icon"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="m">
            <h3 className="adding-a-source__name">
              <EuiTextColor color="default">{name}</EuiTextColor>
            </h3>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {categories.map((category) => startCase(category)).join(', ')}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
