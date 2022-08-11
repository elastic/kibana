/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { startCase } from 'lodash';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SourceIcon } from '../../../../components/shared/source_icon';

interface AddSourceHeaderProps {
  name: string;
  serviceType: string;
  categories?: string[];
}

export const AddSourceHeader: React.FC<AddSourceHeaderProps> = ({
  name,
  serviceType,
  categories = [],
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
            name={name}
            className="adding-a-source__icon"
            size="xxl"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>
              <EuiTextColor color="default">{name}</EuiTextColor>
            </h1>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {serviceType === 'external'
              ? i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.addSource.addSourceHeader.externalConnectorLabel',
                  {
                    defaultMessage: 'Externally deployed connector package',
                  }
                )
              : categories.map((category) => startCase(category)).join(', ')}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
