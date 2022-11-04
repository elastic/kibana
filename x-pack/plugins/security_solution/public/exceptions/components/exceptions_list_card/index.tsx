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
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ExceptionListTypeEnum, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { HeaderMenu } from '@kbn/securitysolution-exception-list-components';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
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
  z-index: 100;
  span {
    cursor: pointer;
    display: block;
  }
`;
const ExceptionPanel = styled(EuiPanel)`
  margin: -${euiThemeVars.euiSizeS} ${euiThemeVars.euiSizeM} 0 ${euiThemeVars.euiSizeM};
`;
const ListHeaderContainer = styled(EuiFlexGroup)`
  padding: ${euiThemeVars.euiSizeS};
`;
export const ExceptionsListCard = memo<ExceptionsListCardProps>(
  ({ exceptionsList, handleDelete, handleExport, readOnly }) => {
    // TODO Move all the logic to the use_exceptions_list.card
    const [toggleAccordion, setToggleAccordion] = useState(false);
    const openAccordionId = useGeneratedHtmlId({ prefix: 'openAccordion' });

    const listCannotBeEdited = checkIfListCannotBeEdited(exceptionsList);
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
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPanel hasShadow={false}>
            <EuiAccordion
              buttonProps={{ css: buttonCss }}
              id={openAccordionId}
              arrowDisplay="none"
              onToggle={() => setToggleAccordion(!toggleAccordion)}
              buttonContent={
                <EuiPanel>
                  <ListHeaderContainer gutterSize="m" alignItems="flexStart">
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType={toggleAccordion ? 'arrowRight' : 'arrowDown'}
                        aria-label="Next"
                      />
                    </EuiFlexItem>
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
                            actions={[
                              {
                                key: '1',
                                icon: 'exportAction',
                                label: i18n.EXPORT_EXCEPTION_LIST,
                                onClick: (e) => {
                                  handleExport({
                                    id: exceptionsList.id,
                                    listId: exceptionsList.list_id,
                                    namespaceType: exceptionsList.namespace_type,
                                  })();
                                  e.stopPropagation();
                                  e.preventDefault();
                                },
                              },
                              {
                                key: '2',
                                icon: 'trash',
                                disabled: listCannotBeEdited,
                                label: i18n.DELETE_EXCEPTION_LIST,
                                onClick: (e) => {
                                  handleDelete({
                                    id: exceptionsList.id,
                                    listId: exceptionsList.list_id,
                                    namespaceType: exceptionsList.namespace_type,
                                  })();
                                  e.stopPropagation();
                                  e.preventDefault();
                                },
                              },
                            ]}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </ListHeaderContainer>
                </EuiPanel>
              }
            >
              <ExceptionPanel hasBorder>
                <ListExceptionItems
                  isReadOnly={readOnly}
                  exceptions={exceptions}
                  listType={exceptionsList.type as ExceptionListTypeEnum}
                  lastUpdated={lastUpdated}
                  pagination={pagination}
                  emptyViewerTitle={''}
                  emptyViewerBody={''}
                  hideUtility
                  viewerStatus={exceptionViewerStatus}
                  ruleReferences={ruleReferences}
                  onDeleteException={onDeleteException}
                  onEditExceptionItem={onEditExceptionItem}
                  onPaginationChange={onPaginationChange}
                  onCreateExceptionListItem={() => {}} // remove from here
                />
              </ExceptionPanel>
            </EuiAccordion>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionsListCard.displayName = 'ExceptionsListCard';
