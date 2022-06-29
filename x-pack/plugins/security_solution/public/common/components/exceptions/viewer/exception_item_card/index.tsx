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
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getFormattedComments } from '../../helpers';
import type { ExceptionListItemIdentifiers } from '../../types';
import * as i18n from './translations';
import { ExceptionItemCardHeader } from './exception_item_card_header';
import { ExceptionItemCardConditions } from './exception_item_card_conditions';
import { ExceptionItemCardMetaInfo } from './exception_item_card_meta';

export interface ExceptionItemProps {
  loadingItemIds: ExceptionListItemIdentifiers[];
  exceptionItem: ExceptionListItemSchema;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
  disableActions: boolean;
  dataTestSubj: string;
}

const ExceptionItemCardComponent = ({
  disableActions,
  loadingItemIds,
  exceptionItem,
  onDeleteException,
  onEditException,
  dataTestSubj,
}: ExceptionItemProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const handleDelete = useCallback((): void => {
    onDeleteException({
      id: exceptionItem.id,
      namespaceType: exceptionItem.namespace_type,
    });
  }, [onDeleteException, exceptionItem.id, exceptionItem.namespace_type]);

  const handleEdit = useCallback((): void => {
    onEditException(exceptionItem);
  }, [onEditException, exceptionItem]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem.comments]);

  const disableItemActions = useMemo((): boolean => {
    const foundItems = loadingItemIds.filter(({ id }) => id === exceptionItem.id);
    return disableActions || foundItems.length > 0;
  }, [loadingItemIds, exceptionItem.id, disableActions]);

  return (
    <EuiPanel paddingSize="l" data-test-subj={dataTestSubj} hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem data-test-subj={`${dataTestSubj}-header`}>
          <ExceptionItemCardHeader
            item={exceptionItem}
            actions={[
              {
                key: 'edit',
                icon: 'pencil',
                label: i18n.EXCEPTION_ITEM_EDIT_BUTTON,
                onClick: handleEdit,
              },
              {
                key: 'delete',
                icon: 'trash',
                label: i18n.EXCEPTION_ITEM_DELETE_BUTTON,
                onClick: handleDelete,
              },
            ]}
            disableActions={disableItemActions}
            dataTestSubj="exceptionItemCardHeader"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={`${dataTestSubj}-meta`}>
          <ExceptionItemCardMetaInfo
            item={exceptionItem}
            dataTestSubj="exceptionItemCardMetaInfo"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ExceptionItemCardConditions
            entries={exceptionItem.entries}
            dataTestSubj="exceptionItemCardConditions"
          />
        </EuiFlexItem>
        {formattedComments.length > 0 && (
          <EuiFlexItem>
            <EuiAccordion
              id="exceptionItemCardComments"
              buttonContent={
                <EuiText size="s" style={{ color: euiTheme.colors.primary }}>
                  {i18n.exceptionItemCommentsAccordion(formattedComments.length)}
                </EuiText>
              }
              arrowDisplay="none"
              data-test-subj="exceptionsViewerCommentAccordion"
            >
              <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
                <EuiCommentList comments={formattedComments} />
              </EuiPanel>
            </EuiAccordion>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExceptionItemCardComponent.displayName = 'ExceptionItemCardComponent';

export const ExceptionItemCard = React.memo(ExceptionItemCardComponent);

ExceptionItemCard.displayName = 'ExceptionItemCard';
