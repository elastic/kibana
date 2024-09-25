/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AccessControlSelectorOption {
  description: string;
  error: boolean;
  title: string;
  value: 'content-index' | 'access-control-index';
}

interface IndexSelectorProps {
  accessControlIndexDescription?: string;
  accessControlIndexTitle?: string;
  accessSyncError?: boolean;
  contentIndexDescription?: string;
  contentIndexTitle?: string;
  contentSyncError?: boolean;
  fullWidth?: boolean;
  onChange(value: AccessControlSelectorOption['value']): void;
  valueOfSelected?: AccessControlSelectorOption['value'];
}

export const AccessControlIndexSelector: React.FC<IndexSelectorProps> = ({
  accessControlIndexDescription,
  accessControlIndexTitle,
  accessSyncError,
  contentIndexDescription,
  contentIndexTitle,
  contentSyncError,
  onChange,
  valueOfSelected,
  fullWidth,
}) => {
  const indexSelectorOptions: AccessControlSelectorOption[] = [
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndex.description',
        {
          defaultMessage: contentIndexDescription || 'Browse content fields',
        }
      ),
      error: Boolean(contentSyncError),
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndex.title',
        {
          defaultMessage: contentIndexTitle || 'Content index',
        }
      ),
      value: 'content-index',
    },
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.selector.accessControl.description',
        {
          defaultMessage: accessControlIndexDescription || 'Browse document level security fields',
        }
      ),
      error: Boolean(accessSyncError),
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.documents.selector.accessControl.title',
        {
          defaultMessage: accessControlIndexTitle || 'Access control index',
        }
      ),
      value: 'access-control-index',
    },
  ];

  return (
    <EuiSuperSelect
      fullWidth={fullWidth}
      valueOfSelected={valueOfSelected}
      onChange={onChange}
      prepend={contentSyncError || accessSyncError ? <EuiIcon type={'warning'} /> : undefined}
      options={indexSelectorOptions.map((option) => {
        return {
          dropdownDisplay: (
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
              {option.error ? (
                <EuiFlexItem grow={false} align>
                  <EuiIcon type={'warning'} />{' '}
                </EuiFlexItem>
              ) : null}

              <EuiFlexGroup direction="column" gutterSize="none">
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
              </EuiFlexGroup>
            </EuiFlexGroup>
          ),
          inputDisplay: option.title,
          value: option.value,
        };
      })}
    />
  );
};
