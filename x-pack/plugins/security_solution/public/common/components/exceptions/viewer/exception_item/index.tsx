/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiFlexGroup,
  EuiCommentProps,
  EuiCommentList,
  EuiAccordion,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionDetails } from './exception_details';
import { ExceptionEntries } from './exception_entries';
import { getFormattedComments } from '../../helpers';
import { getFormattedEntries } from '../helpers';
import type { FormattedEntry, ExceptionListItemIdentifiers } from '../../types';

const MyFlexItem = styled(EuiFlexItem)`
  &.comments--show {
    padding: ${({ theme }) => theme.eui.euiSize};
    border-top: ${({ theme }) => `${theme.eui.euiBorderThin}`};
  }
`;

export interface ExceptionItemProps {
  loadingItemIds: ExceptionListItemIdentifiers[];
  exceptionItem: ExceptionListItemSchema;
  commentsAccordionId: string;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
  showName?: boolean;
  showModified?: boolean;
  disableActions: boolean;
  'data-test-subj'?: string;
}

const ExceptionItemComponent = ({
  disableActions,
  loadingItemIds,
  exceptionItem,
  commentsAccordionId,
  onDeleteException,
  onEditException,
  showModified = false,
  showName = false,
  'data-test-subj': dataTestSubj,
}: ExceptionItemProps): JSX.Element => {
  const [entryItems, setEntryItems] = useState<FormattedEntry[]>([]);
  const [showComments, setShowComments] = useState(false);

  useEffect((): void => {
    const formattedEntries = getFormattedEntries(exceptionItem.entries);
    setEntryItems(formattedEntries);
  }, [exceptionItem.entries]);

  const handleDelete = useCallback((): void => {
    onDeleteException({
      id: exceptionItem.id,
      namespaceType: exceptionItem.namespace_type,
    });
  }, [onDeleteException, exceptionItem.id, exceptionItem.namespace_type]);

  const handleEdit = useCallback((): void => {
    onEditException(exceptionItem);
  }, [onEditException, exceptionItem]);

  const onCommentsClick = useCallback((): void => {
    setShowComments(!showComments);
  }, [setShowComments, showComments]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem.comments]);

  const disableItemActions = useMemo((): boolean => {
    const foundItems = loadingItemIds.filter(({ id }) => id === exceptionItem.id);
    return foundItems.length > 0;
  }, [loadingItemIds, exceptionItem.id]);

  return (
    <EuiPanel paddingSize="none" data-test-subj={dataTestSubj} hasBorder hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <ExceptionDetails
              showComments={showComments}
              exceptionItem={exceptionItem}
              onCommentsClick={onCommentsClick}
              showModified={showModified}
              showName={showName}
            />
            <ExceptionEntries
              disableActions={disableItemActions || disableActions}
              entries={entryItems}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
        <MyFlexItem className={showComments ? 'comments--show' : ''}>
          <EuiAccordion
            id={commentsAccordionId}
            arrowDisplay="none"
            forceState={showComments ? 'open' : 'closed'}
            data-test-subj="exceptionsViewerCommentAccordion"
          >
            <EuiCommentList comments={formattedComments} />
          </EuiAccordion>
        </MyFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExceptionItemComponent.displayName = 'ExceptionItemComponent';

export const ExceptionItem = React.memo(ExceptionItemComponent);

ExceptionItem.displayName = 'ExceptionItem';
