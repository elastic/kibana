/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiPanel,
  EuiText,
  EuiAccordion,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { HeaderMenu } from '@kbn/securitysolution-exception-list-components';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Rule } from '../../../detection_engine/rule_management/logic/types';
import { EditExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/edit_exception_flyout';
import { AddExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import type { ExceptionListInfo } from '../../hooks/use_all_exception_lists';
import { TitleBadge } from '../title_badge';
import * as i18n from '../../translations';
import { ListExceptionItems } from '../list_exception_items';
import { useListDetailsView } from '../../hooks';
import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';
import { ManageRules } from '../manage_rules';
import { IncludeExpiredExceptionsModal } from '../expired_exceptions_list_items_modal';

interface ExceptionsListCardProps {
  exceptionsList: ExceptionListInfo;
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
    includeExpiredExceptions,
    listId,
    name,
    namespaceType,
  }: {
    id: string;
    includeExpiredExceptions: boolean;
    listId: string;
    name: string;
    namespaceType: NamespaceType;
  }) => () => Promise<void>;
  handleDuplicate: ({
    includeExpiredExceptions,
    listId,
    name,
    namespaceType,
  }: {
    includeExpiredExceptions: boolean;
    listId: string;
    name: string;
    namespaceType: NamespaceType;
  }) => () => Promise<void>;
  readOnly: boolean;
}

const ExceptionPanel = styled(EuiPanel)`
  margin: -${euiThemeVars.euiSizeS} ${euiThemeVars.euiSizeM} 0 ${euiThemeVars.euiSizeM};
`;
const ListHeaderContainer = styled(EuiFlexGroup)`
  padding: ${euiThemeVars.euiSizeS};
  text-align: initial;
`;
export const ExceptionsListCard = memo<ExceptionsListCardProps>(
  ({ exceptionsList, handleDelete, handleExport, handleDuplicate, readOnly }) => {
    const {
      linkedRules,
      showManageRulesFlyout,
      showManageButtonLoader,
      disableManageButton,
      onManageRules,
      onSaveManageRules,
      onCancelManageRules,
      onRuleSelectionChange,
    } = useListDetailsView(exceptionsList.list_id);
    const { euiTheme } = useEuiTheme();
    const panelShadow = useEuiShadow();

    const euiAccordionStyles = useMemo(
      () => css`
        .euiAccordion__buttonContent {
          flex: 1 1 auto;
          cursor: pointer;
        }
        .euiAccordion__triggerWrapper {
          z-index: 100;
          position: relative;
          border-radius: ${euiTheme.border.radius.medium};
          padding: ${euiTheme.size.base};
          ${panelShadow}
        }
      `,
      [euiTheme.border.radius.medium, euiTheme.size.base, panelShadow]
    );

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
      goToExceptionDetail,
      emptyViewerTitle,
      emptyViewerBody,
      emptyViewerButtonText,
      handleCancelExpiredExceptionsModal,
      handleConfirmExpiredExceptionsModal,
      showIncludeExpiredExceptionsModal,
    } = useExceptionsListCard({
      exceptionsList,
      handleExport,
      handleDelete,
      handleDuplicate,
      handleManageRules: onManageRules,
    });

    return (
      <>
        <EuiAccordion
          // Note: this uses `className` instead of the `css` prop, because a plugin
          // cannot be set up for styled-components and `@emotion/react` at the same time
          // @see https://github.com/elastic/eui/discussions/6828#discussioncomment-6076157
          className={euiAccordionStyles}
          id={openAccordionId}
          buttonElement="div"
          onToggle={() => setToggleAccordion(!toggleAccordion)}
          buttonContent={
            <ListHeaderContainer gutterSize="m" alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  direction="column"
                  key={listId}
                  alignItems="flexStart"
                  gutterSize="none"
                >
                  <EuiFlexItem grow>
                    <EuiText size="m">
                      <EuiLink data-test-subj="exception-list-name" onClick={goToExceptionDetail}>
                        {listName}
                      </EuiLink>
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
                <EuiFlexGroup alignItems="center" justifyContent="flexEnd" wrap responsive>
                  <EuiFlexItem grow={false}>
                    <TitleBadge title={i18n.DATE_CREATED} badgeString={createdAt} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <TitleBadge title={i18n.CREATED_BY} badgeString={createdBy} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <TitleBadge title={i18n.EXCEPTIONS} badgeString={exceptionItemsCount} />
                  </EuiFlexItem>
                  <EuiFlexItem data-test-subj="exceptionListCardLinkedRulesBadge" grow={false}>
                    <TitleBadge title={i18n.RULES} badgeString={linkedRules.length.toString()} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <HeaderMenu
                  disableActions={readOnly}
                  dataTestSubj="sharedListOverflowCard"
                  actions={menuActionItems}
                />
              </EuiFlexItem>
            </ListHeaderContainer>
          }
          data-test-subj={`exceptionsManagementListCard-${listId}`}
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
              onCreateExceptionListItem={onAddExceptionClick}
              lastUpdated={null}
              emptyViewerTitle={emptyViewerTitle}
              emptyViewerBody={emptyViewerBody}
              emptyViewerButtonText={emptyViewerButtonText}
            />
          </ExceptionPanel>
        </EuiAccordion>
        {showAddExceptionFlyout ? (
          <AddExceptionFlyout
            rules={null}
            isBulkAction={false}
            isEndpointItem={listType === ExceptionListTypeEnum.ENDPOINT}
            sharedListToAddTo={[exceptionsList]}
            onCancel={handleCancelExceptionItemFlyout}
            onConfirm={handleConfirmExceptionFlyout}
            data-test-subj="addExceptionItemFlyoutInSharedLists"
            showAlertCloseOptions={false}
          />
        ) : null}
        {showEditExceptionFlyout && exceptionToEdit ? (
          <EditExceptionFlyout
            list={exceptionsList}
            itemToEdit={exceptionToEdit}
            showAlertCloseOptions
            openedFromListDetailPage
            onCancel={handleCancelExceptionItemFlyout}
            onConfirm={handleConfirmExceptionFlyout}
            data-test-subj="editExceptionItemFlyoutInSharedLists"
          />
        ) : null}
        {showManageRulesFlyout ? (
          <ManageRules
            linkedRules={linkedRules as Rule[]}
            showButtonLoader={showManageButtonLoader}
            saveIsDisabled={disableManageButton}
            onSave={onSaveManageRules}
            onCancel={onCancelManageRules}
            onRuleSelectionChange={onRuleSelectionChange}
          />
        ) : null}
        {showIncludeExpiredExceptionsModal ? (
          <IncludeExpiredExceptionsModal
            handleCloseModal={handleCancelExpiredExceptionsModal}
            onModalConfirm={handleConfirmExpiredExceptionsModal}
            action={showIncludeExpiredExceptionsModal}
          />
        ) : null}
      </>
    );
  }
);

ExceptionsListCard.displayName = 'ExceptionsListCard';
