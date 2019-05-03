/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnColumnRemoved } from '../../../events';
import { Sort } from '../../sort';
import { SortIndicator } from '../../sort/sort_indicator';
import { ColumnHeader } from '../column_header';
import { getSortDirection, justifyActions } from '../header/helpers';
import * as i18n from '../translations';

const closeButtonSize = 25; // px
const sortIndicatorSize = 25; // px
export const ACTIONS_WIDTH = sortIndicatorSize + closeButtonSize; // px

const ActionsContainer = styled(EuiFlexGroup)`
  height: 100%;
  width: ${ACTIONS_WIDTH}px;
`;

const WrappedCloseButton = styled.div<{ show: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

interface Props {
  header: ColumnHeader;
  isLoading: boolean;
  onColumnRemoved: OnColumnRemoved;
  show: boolean;
  sort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */

export const CloseButton = pure<{
  columnId: string;
  onColumnRemoved: OnColumnRemoved;
  show: boolean;
}>(({ columnId, onColumnRemoved, show }) => (
  <WrappedCloseButton data-test-subj="wrapped-close-button" show={show}>
    <EuiButtonIcon
      aria-label={i18n.REMOVE_COLUMN}
      data-test-subj="remove-column"
      iconType="cross"
      onClick={() => onColumnRemoved(columnId)}
    />
  </WrappedCloseButton>
));

export const Actions = pure<Props>(({ header, isLoading, onColumnRemoved, show, sort }) => (
  <ActionsContainer
    alignItems="center"
    justifyContent={justifyActions(isLoading)}
    gutterSize="none"
  >
    <EuiFlexItem grow={false}>
      <SortIndicator
        data-test-subj="header-sort-indicator"
        sortDirection={getSortDirection({ header, sort })}
      />
    </EuiFlexItem>

    {sort.columnId === header.id && isLoading ? (
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
    ) : (
      <EuiFlexItem grow={false}>
        <CloseButton columnId={header.id} onColumnRemoved={onColumnRemoved} show={show} />
      </EuiFlexItem>
    )}
  </ActionsContainer>
));
