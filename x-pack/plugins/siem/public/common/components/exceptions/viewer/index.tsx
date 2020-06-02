/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiFlexGroup, EuiCommentList, EuiAccordion, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

import { ExceptionDetails } from './exception_details';
import { ExceptionEntries } from './exception_entries';
import { getFormattedEntries, getFormattedComments } from '../helpers';
import { FormattedEntry, ExceptionListItemSchema } from '../types';

const MyFlexItem = styled(EuiFlexItem)`
  &.comments--show {
    padding: 16px;
    border-top: 1px solid #d3dae6;
  }
`;

interface ExceptionItemProps {
  exceptionItem: ExceptionListItemSchema;
  handleDelete: ({ id }: { id: string }) => void;
  handleEdit: (item: ExceptionListItemSchema) => void;
}

const ExceptionItemComponent = ({
  exceptionItem,
  handleDelete,
  handleEdit,
}: ExceptionItemProps) => {
  const [entryItems, setEntryItems] = useState<FormattedEntry[]>([]);
  const [showComments, setShowComments] = useState<boolean>(false);

  useEffect(() => {
    const formattedEntries = getFormattedEntries(exceptionItem.entries ?? []);
    setEntryItems([...formattedEntries]);
  }, [exceptionItem.entries]);

  const onDelete = useCallback(() => {
    handleDelete({ id: exceptionItem.id });
  }, [handleDelete, exceptionItem]);

  const onEdit = useCallback(() => {
    handleEdit(exceptionItem);
  }, [handleEdit, exceptionItem]);

  const onCommentsClick = useCallback(() => {
    setShowComments(!showComments);
  }, [setShowComments, showComments]);

  const formattedComments = useMemo(() => {
    return getFormattedComments(exceptionItem.comments ?? []);
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
            id="accordion--comments"
            arrowDisplay="none"
            forceState={showComments ? 'open' : 'closed'}
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
