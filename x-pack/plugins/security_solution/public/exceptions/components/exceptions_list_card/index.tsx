/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';

import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiPanel,
  EuiText,
  EuiAccordion,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { Action, HeaderMenu } from '@kbn/securitysolution-exception-list-components';
import type { ExceptionListInfo } from '../../hooks/use_all_exception_lists';
import { TitleBadge } from '../title_badge';
import * as i18n from '../../translations/translations';
import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';
import { ListExceptionItems } from '../list_exception_items';
import { checkIfListCannotBeEdited } from '../../utils/list.utils';

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
const buttonCss = css`
  width: 100%;
  span {
    cursor: pointer;
    display: block;
  }
`;

export const ExceptionsListCard = memo<ExceptionsListCardProps>(
  ({ exceptionsList, handleDelete, handleExport, readOnly }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [toggleAccordion, setToggleAccordion] = useState(false);

    const onItemActionsClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    const onClosePopover = () => setIsPopoverOpen(false);
    const openAccordionId = useGeneratedHtmlId({ prefix: 'openAccordion' });

    const listCannotBeEdited = checkIfListCannotBeEdited(exceptionsList);
    console.log(listCannotBeEdited);
    const {
      lastUpdated,
      exceptions,
      pagination,
      exceptionViewerStatus,
      ruleReferences,
      onEditExceptionItem,
      onDeleteException,
      onPaginationChange,
    } = useExceptionsListCard({
      exceptionsList,
    });
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <EuiAccordion
              buttonProps={{ css: buttonCss }}
              id={openAccordionId}
              onToggle={() => setToggleAccordion(!toggleAccordion)}
              buttonContent={
                <EuiPanel hasShadow={false}>
                  <EuiFlexGroup alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiFlexGroup
                        direction="column"
                        key={exceptionsList.list_id}
                        alignItems="flexStart"
                        gutterSize="none"
                      >
                        <EuiFlexItem grow>
                          <EuiText size="m">
                            <EuiLink data-test-subj="exception-list-name">
                              {exceptionsList.name}
                            </EuiLink>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow>
                          <EuiText size="xs">
                            <EuiTextColor color="subdued">
                              {exceptionsList.description}
                            </EuiTextColor>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem>
                          <TitleBadge
                            title={i18n.DATE_CREATED}
                            badgeString={new Date(exceptionsList.created_at).toDateString()}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge
                            title={i18n.CREATED_BY}
                            badgeString={exceptionsList.created_by}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge
                            title={i18n.EXCEPTIONS}
                            badgeString={exceptions.length.toString()}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge
                            title={i18n.RULES}
                            badgeString={exceptionsList.rules.length.toString()}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <HeaderMenu
                            disableActions={readOnly}
                            actions={
                              [
                                {
                                  key: '1',
                                  icon: 'exportAction',
                                  label: i18n.EXPORT_EXCEPTION_LIST,
                                  onClick: () => {
                                    handleExport({
                                      id: exceptionsList.id,
                                      listId: exceptionsList.list_id,
                                      namespaceType: exceptionsList.namespace_type,
                                    })();
                                  },
                                },
                                {
                                  key: '2',
                                  icon: 'trash',
                                  disabled: listCannotBeEdited || readOnly,
                                  label: i18n.DELETE_EXCEPTION_LIST,
                                  onClick: () => {
                                    handleDelete({
                                      id: exceptionsList.id,
                                      listId: exceptionsList.list_id,
                                      namespaceType: exceptionsList.namespace_type,
                                    })();
                                  },
                                },
                              ] as Action[]
                            }
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              }
            />
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
