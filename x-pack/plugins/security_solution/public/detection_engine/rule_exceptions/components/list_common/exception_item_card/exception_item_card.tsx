/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { getFormattedComments } from '../../../utils/helpers';
import * as i18n from './translations';
import {
  ExceptionItemCardHeader,
  ExceptionItemCardConditions,
  ExceptionItemCardMetaInfo,
  ExceptionItemCardComments,
} from '.';

import type { RuleReferenceSchema, ExceptionListItemIdentifiers } from '../types';

export interface ExceptionItemProps {
  dataTestSubj?: string;
  disableActions?: boolean;
  exceptionItem: ExceptionListItemSchema;
  listType: ExceptionListTypeEnum;
  ruleReferences: RuleReferenceSchema[];
  editActionLabel?: string;
  deleteActionLabel?: string;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
}

const ExceptionItemCardComponent = ({
  disableActions = false,
  exceptionItem,
  listType,
  ruleReferences,
  dataTestSubj,
  editActionLabel,
  deleteActionLabel,
  onDeleteException,
  onEditException,
}: ExceptionItemProps): JSX.Element => {
  const handleDelete = useCallback((): void => {
    onDeleteException({
      id: exceptionItem.id,
      name: exceptionItem.name,
      namespaceType: exceptionItem.namespace_type,
    });
  }, [onDeleteException, exceptionItem.id, exceptionItem.name, exceptionItem.namespace_type]);

  const handleEdit = useCallback((): void => {
    onEditException(exceptionItem);
  }, [onEditException, exceptionItem]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem.comments]);

  const actions = useMemo(
    () => [
      {
        key: 'edit',
        icon: 'controlsHorizontal',
        label: (editActionLabel || i18n.EXCEPTION_ITEM_EDIT_BUTTON(listType)) as string,
        onClick: handleEdit,
      },
      {
        key: 'delete',
        icon: 'trash',
        label: (deleteActionLabel ||
          listType === i18n.EXCEPTION_ITEM_DELETE_BUTTON(listType)) as string,
        onClick: handleDelete,
      },
    ],
    [editActionLabel, listType, deleteActionLabel, handleDelete, handleEdit]
  );
  return (
    <EuiPanel paddingSize="l" data-test-subj={dataTestSubj} hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem data-test-subj="exceptionItemCard-header">
          <ExceptionItemCardHeader
            item={exceptionItem}
            actions={actions}
            disableActions={disableActions}
            dataTestSubj="exceptionItemCardHeader"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="exceptionItemCard-meta">
          <ExceptionItemCardMetaInfo
            item={exceptionItem}
            references={ruleReferences}
            dataTestSubj="exceptionItemCardMetaInfo"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="exceptionItemCard-condition">
          <ExceptionItemCardConditions
            os={exceptionItem.os_types}
            entries={exceptionItem.entries}
            dataTestSubj="exceptionItemCardConditions"
          />
        </EuiFlexItem>
        {formattedComments.length > 0 && (
          <ExceptionItemCardComments
            data-test-subj="exceptionItemCard-comment"
            comments={formattedComments}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExceptionItemCardComponent.displayName = 'ExceptionItemCardComponent';

export const ExceptionItemCard = React.memo(ExceptionItemCardComponent);

ExceptionItemCard.displayName = 'ExceptionItemCard';
