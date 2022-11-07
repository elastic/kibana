/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiPanel,
  EuiText,
  EuiAccordion,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { HeaderMenu } from '@kbn/securitysolution-exception-list-components';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
import { EditExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/edit_exception_flyout';
import { AddExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import type { ExceptionListInfo } from '../../hooks/use_all_exception_lists';
import { TitleBadge } from '../title_badge';
import * as i18n from '../../translations/translations';
import { ListExceptionItems } from '../list_exception_items';
import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';

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
  // Ask KIBANA Team why Emotion is not working fully under xpack
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
    const {
      listId,
      listName,
      listType,
      createdAt,
      createdBy,
      exceptions,
      pagination,
      ruleReferences,
      toggleAccordion,
      openAccordionId,
      menuActionItems,
      listRulesCount,
      listDescription,
      exceptionItemsCount,
      onEditExceptionItem,
      onDeleteException,
      onPaginationChange,
      setToggleAccordion,
      exceptionViewerStatus,
      showAddExceptionFlyout,
      showEditExceptionFlyout,
      exceptionToEdit,
      onAddExceptionClick,
      handleConfirmExceptionFlyout,
      handleCancelExceptionItemFlyout,
    } = useExceptionsListCard({
      exceptionsList,
      handleExport,
      handleDelete,
    });

    if (showAddExceptionFlyout)
      return (
        <AddExceptionFlyout
          rules={null}
          isBulkAction={false}
          isEndpointItem={listType === ExceptionListTypeEnum.ENDPOINT}
          onCancel={handleCancelExceptionItemFlyout}
          onConfirm={handleConfirmExceptionFlyout}
          data-test-subj="addExceptionItemFlyoutInList"
          showAlertCloseOptions={false} // TODO ask if we need it
          // ask if we need the add to rule/list section and which list should we link the exception here
        />
      );
    if (showEditExceptionFlyout && exceptionToEdit)
      return (
        <EditExceptionFlyout
          list={exceptionsList}
          itemToEdit={exceptionToEdit}
          showAlertCloseOptions
          onCancel={handleCancelExceptionItemFlyout}
          onConfirm={handleConfirmExceptionFlyout}
          data-test-subj="editExceptionItemFlyoutInList"
        />
      );

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
                        key={listId}
                        alignItems="flexStart"
                        gutterSize="none"
                      >
                        <EuiFlexItem grow>
                          <EuiText size="m">
                            <EuiLink data-test-subj="exception-list-name">{listName}</EuiLink>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow>
                          <EuiText size="xs">
                            <EuiTextColor color="subdued">{listDescription}</EuiTextColor>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem>
                          <TitleBadge title={i18n.DATE_CREATED} badgeString={createdAt} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge title={i18n.CREATED_BY} badgeString={createdBy} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge title={i18n.EXCEPTIONS} badgeString={exceptionItemsCount} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <TitleBadge title={i18n.RULES} badgeString={listRulesCount} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <HeaderMenu
                            disableActions={readOnly}
                            dataTestSubj="exceptionsListCardOverflowActions"
                            actions={menuActionItems}
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
                  pagination={pagination}
                  hideUtility
                  viewerStatus={exceptionViewerStatus}
                  ruleReferences={ruleReferences}
                  onDeleteException={onDeleteException}
                  onEditExceptionItem={onEditExceptionItem}
                  onPaginationChange={onPaginationChange}
                  onCreateExceptionListItem={onAddExceptionClick} // remove from here
                  lastUpdated={null}
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
