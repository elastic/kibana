/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiSuperSelect, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AccessControlSelectorOption {
  description: string;
  title: string;
  value: 'content-index' | 'access-control-index';
}

const indexSelectorOptions: AccessControlSelectorOption[] = [
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndex.description',
      {
        defaultMessage: 'Browse content fields',
      }
    ),
    title: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndex.title',
      {
        defaultMessage: 'Content index',
      }
    ),
    value: 'content-index',
  },
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndex.documents.selector.accessControl.description',
      {
        defaultMessage: 'Browse document level security fields',
      }
    ),
    title: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndex.documents.selector.accessControl.title',
      {
        defaultMessage: 'Access control index',
      }
    ),
    value: 'access-control-index',
  },
];

interface IndexSelectorProps {
  onChange(value: AccessControlSelectorOption['value']): void;
  valueOfSelected?: AccessControlSelectorOption['value'];
}

export const AccessControlIndexSelector: React.FC<IndexSelectorProps> = ({
  valueOfSelected,
  onChange,
}) => {
  return (
    <EuiSuperSelect
      valueOfSelected={valueOfSelected}
      onChange={onChange}
      options={indexSelectorOptions.map((option) => {
        return {
          dropdownDisplay: (
            <EuiFlexGrid gutterSize="none">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>{option.title}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <p>{option.description}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGrid>
          ),
          inputDisplay: option.title,
          value: option.value,
        };
      })}
    />
  );
};
