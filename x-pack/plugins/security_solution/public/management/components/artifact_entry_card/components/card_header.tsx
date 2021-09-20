/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { DateFieldValue } from './date_field_value';
import { ActionsContextMenu, ActionsContextMenuProps } from '../../actions_context_menu';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export interface CardHeaderProps extends Pick<CommonProps, 'data-test-subj'> {
  name: string;
  createdDate?: string;
  updatedDate?: string;
  /** If defined, then an overflow menu will be shown with the actions provided */
  actions?: ActionsContextMenuProps['items'];
}

export const CardHeader = memo<CardHeaderProps>(
  ({ name, createdDate, updatedDate, actions, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup responsive={false} data-test-subj={dataTestSubj}>
        <EuiFlexItem grow={true}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h3 data-test-subj={getTestId('title')}>{name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="xl">
                <EuiFlexItem grow={false}>
                  {updatedDate ? (
                    <DateFieldValue
                      date={updatedDate}
                      type="update"
                      data-test-subj={getTestId('updated')}
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {createdDate ? (
                    <DateFieldValue
                      date={createdDate}
                      type="create"
                      data-test-subj={getTestId('created')}
                    />
                  ) : null}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {actions && actions.length > 0 && (
          <EuiFlexItem grow={false}>
            <ActionsContextMenu
              items={actions}
              icon="boxesHorizontal"
              data-test-subj={getTestId('actions')}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

CardHeader.displayName = 'CardHeader';
