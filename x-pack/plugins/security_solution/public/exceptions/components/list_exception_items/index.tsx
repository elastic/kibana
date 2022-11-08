/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';
import type {
  ExceptionListItemIdentifiers,
  GetExceptionItemProps,
  RuleReferences,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';
import { ExceptionItems } from '@kbn/securitysolution-exception-list-components';
import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import type { Pagination } from '@elastic/eui';
import { FormattedDate } from '../../../common/components/formatted_date';
import { getFormattedComments } from '../../utils/ui.helpers';
import { ListDetailsLinkAnchor } from '../list_details_link_anchor';
import { ExceptionsUtility } from '../exceptions_utility';
import * as i18n from '../../translations/list_exception_items';

interface ListExceptionItemsProps {
  isReadOnly: boolean;
  exceptions: ExceptionListItemSchema[];
  listType: ExceptionListTypeEnum;
  lastUpdated: string | number | null;
  pagination: Pagination;
  emptyViewerTitle?: string;
  emptyViewerBody?: string;
  viewerStatus: ViewerStatus | '';
  ruleReferences: RuleReferences;
  hideUtility?: boolean;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
  onCreateExceptionListItem: () => void;
}

const ListExceptionItemsComponent: FC<ListExceptionItemsProps> = ({
  isReadOnly,
  exceptions,
  listType,
  lastUpdated,
  pagination,
  emptyViewerTitle,
  emptyViewerBody,
  viewerStatus,
  ruleReferences,
  hideUtility = false,
  onDeleteException,
  onEditExceptionItem,
  onPaginationChange,
  onCreateExceptionListItem,
}) => {
  return (
    <>
      <ExceptionItems
        viewerStatus={viewerStatus as ViewerStatus}
        listType={listType as ExceptionListTypeEnum}
        ruleReferences={ruleReferences}
        isReadOnly={isReadOnly}
        exceptions={exceptions}
        emptyViewerTitle={emptyViewerTitle}
        emptyViewerBody={emptyViewerBody}
        pagination={pagination}
        lastUpdated={lastUpdated}
        editActionLabel={i18n.EXCEPTION_ITEM_CARD_EDIT_LABEL}
        deleteActionLabel={i18n.EXCEPTION_ITEM_CARD_DELETE_LABEL}
        onPaginationChange={onPaginationChange}
        onEditExceptionItem={onEditExceptionItem}
        onDeleteException={onDeleteException}
        getFormattedComments={getFormattedComments}
        securityLinkAnchorComponent={ListDetailsLinkAnchor}
        formattedDateComponent={FormattedDate}
        onCreateExceptionListItem={onCreateExceptionListItem}
        exceptionsUtilityComponent={() =>
          hideUtility ? null : (
            <ExceptionsUtility
              exceptionsTitle={i18n.EXCEPTION_UTILITY_TITLE}
              pagination={pagination}
              lastUpdated={lastUpdated}
            />
          )
        }
      />
    </>
  );
};

ListExceptionItemsComponent.displayName = 'ListExceptionItemsComponent';

export const ListExceptionItems = React.memo(ListExceptionItemsComponent);

ListExceptionItems.displayName = 'ListExceptionItems';
