/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';

import {
  EuiLink,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionListInfo } from '../../hooks/use_all_exception_lists';
import { TitleBadge } from '../title_badge';
import * as i18n from '../../translations/translations';
// import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';
// import { ListExceptionItems } from '../list_exception_items';

interface ExceptionsListCardProps {
  exceptionsList: ExceptionListInfo;
  http: HttpSetup;
  handleDelete: ({
    id,
    listId,
    namespaceType,
  }: {
    id: string;
    listId: string;
    namespaceType: NamespaceType;
  }) => () => Promise<void>;
  handleExport: ({
    id,
    listId,
    namespaceType,
  }: {
    id: string;
    listId: string;
    namespaceType: NamespaceType;
  }) => () => Promise<void>;
  readOnly: boolean;
}

export const ExceptionsListCard = memo<ExceptionsListCardProps>(
  ({ exceptionsList, handleDelete, handleExport, readOnly }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onItemActionsClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    const onClosePopover = () => setIsPopoverOpen(false);

    // const {
    //   lastUpdated,
    //   exceptions,
    //   pagination,
    //   exceptionViewerStatus,
    //   ruleReferences,
    //   onEditExceptionItem,
    //   onDeleteException,
    //   onPaginationChange,
    // } = useExceptionsListCard({
    //   exceptionsList,
    // });
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <EuiFlexGroup key={exceptionsList.list_id} alignItems="center" gutterSize="l">
              <EuiFlexItem grow={true}>
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup direction="column" alignItems="flexStart">
                      <EuiFlexItem grow={false} component={'span'}>
                        <EuiLink data-test-subj="exception-list-name">
                          {exceptionsList.name.toString()}
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <EuiTextColor color="subdued">{exceptionsList.description}</EuiTextColor>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <TitleBadge title={i18n.CREATED_BY} badgeString={exceptionsList.created_by} />
                      <TitleBadge title={i18n.CREATED_AT} badgeString={exceptionsList.created_at} />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  data-test-subj="exceptionsListCardOverflowActions"
                  button={
                    <EuiButtonIcon
                      isDisabled={false}
                      data-test-subj="exceptionsListCardOverflowActions"
                      aria-label="Exception item actions menu"
                      iconType="boxesHorizontal"
                      onClick={onItemActionsClick}
                    />
                  }
                  panelPaddingSize="none"
                  isOpen={isPopoverOpen}
                  closePopover={onClosePopover}
                >
                  <EuiContextMenuPanel
                    size="s"
                    items={[
                      <EuiContextMenuItem
                        key={'delete'}
                        disabled={exceptionsList.list_id === 'endpoint_list' || readOnly}
                        data-test-subj="exceptionsTableDeleteButton"
                        icon={'trash'}
                        onClick={() => {
                          onClosePopover();
                          handleDelete({
                            id: exceptionsList.id,
                            listId: exceptionsList.list_id,
                            namespaceType: exceptionsList.namespace_type,
                          })();
                        }}
                      >
                        {i18n.DELETE_EXCEPTION_LIST}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key={'export'}
                        icon={'exportAction'}
                        data-test-subj="exceptionsTableExportButton"
                        onClick={() => {
                          onClosePopover();
                          handleExport({
                            id: exceptionsList.id,
                            listId: exceptionsList.list_id,
                            namespaceType: exceptionsList.namespace_type,
                          })();
                        }}
                      >
                        {i18n.EXPORT_EXCEPTION_LIST}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <ListExceptionItems
            isReadOnly={false}
            exceptions={exceptions}
            listType={exceptionsList.type as ExceptionListTypeEnum}
            lastUpdated={lastUpdated}
            pagination={pagination}
            emptyViewerTitle={''}
            emptyViewerBody={''}
            viewerStatus={exceptionViewerStatus}
            ruleReferences={ruleReferences}
            onDeleteException={onDeleteException}
            onEditExceptionItem={onEditExceptionItem}
            onPaginationChange={onPaginationChange}
            onCreateExceptionListItem={() => console.log('ask devin')} // remove from here
          />
        </EuiFlexItem> */}
      </EuiFlexGroup>
    );
  }
);

ExceptionsListCard.displayName = 'ExceptionsListCard';
