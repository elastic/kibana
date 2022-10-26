/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiTitle } from '@elastic/eui';
import React from 'react';
import { FlexGroup, StyledTitle } from './utils';
import * as i18n from '../../containers/query_toggle/translations';

const StatItemHeaderComponent = ({
  toggle,
  toggleStatus,
  description,
}: {
  toggle: () => void;
  toggleStatus: boolean;
  description?: string;
}) => (
  <FlexGroup gutterSize={'none'}>
    <EuiFlexItem className={toggleStatus ? '' : 'no-margin'}>
      <EuiFlexGroup gutterSize={'none'} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
            data-test-subj="query-toggle-stat"
            color="text"
            display="empty"
            iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
            onClick={toggle}
            size="xs"
            title={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <StyledTitle>{description}</StyledTitle>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </FlexGroup>
);
export const StatItemHeader = React.memo(StatItemHeaderComponent);
StatItemHeader.displayName = 'StatItemHeader';
