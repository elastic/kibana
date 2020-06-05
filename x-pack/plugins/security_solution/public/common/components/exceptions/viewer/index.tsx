/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { ExceptionDetails } from './exception_details';
import { ExceptionEntries } from './exception_entries';
import { getFormattedEntries, getFormattedComments } from '../helpers';
import { FormattedEntry, ExceptionListItemSchema } from '../types';

const MyFlexItem = styled(EuiFlexItem)`
    &.comments--show {
      padding: ${({ theme }) => theme.eui.euiSize};
      border-top: ${({ theme }) => `${theme.eui.euiBorderThin}`}

`;

interface ExceptionItemProps {
  exceptionItem: ExceptionListItemSchema;
  commentsAccordionId: string;
  handleDelete: ({ id }: { id: string }) => void;
  handleEdit: (item: ExceptionListItemSchema) => void;
}

const ExceptionItemComponent = ({
  exceptionItem,
  commentsAccordionId,
  handleDelete,
  handleEdit,
}: ExceptionItemProps): JSX.Element => {
  const [entryItems, setEntryItems] = useState<FormattedEntry[]>([]);
  const [showComments, setShowComments] = useState(false);

  useEffect((): void => {
    const formattedEntries = getFormattedEntries(exceptionItem.entries);
    setEntryItems(formattedEntries);
  }, [exceptionItem.entries]);

  const onDelete = useCallback((): void => {
    handleDelete({ id: exceptionItem.id });
  }, [handleDelete, exceptionItem]);

  const onEdit = useCallback((): void => {
    handleEdit(exceptionItem);
  }, [handleEdit, exceptionItem]);

  const onCommentsClick = useCallback((): void => {
    setShowComments(!showComments);
  }, [setShowComments, showComments]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem]);

  return (
    <EuiPanel paddingSize="none">
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <ExceptionDetails
              showComments={showComments}
              exceptionItem={exceptionItem}
              onCommentsClick={onCommentsClick}
            />
            <ExceptionEntries entries={entryItems} handleDelete={onDelete} handleEdit={onEdit} />
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
