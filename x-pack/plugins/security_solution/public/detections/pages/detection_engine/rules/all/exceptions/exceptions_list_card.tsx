/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';

import {
  EuiBadge,
  EuiButtonEmpty,
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
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsViewerItems } from '../../../../../../detection_engine/rule_exceptions/components/all_exception_items_table/all_items';
import type { ExceptionListInfo } from './use_all_exception_lists';

const StyledFlexItem = styled(EuiFlexItem)`
  border-right: 1px solid #d3dae6;
  padding: 4px 12px 4px 0;
`;

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
  handleDuplicate: ({
    id,
    listId,
    namespaceType,
  }: {
    id: string;
    listId: string;
    namespaceType: NamespaceType;
  }) => () => Promise<void>;
}

export const ExceptionsListCard = memo<ExceptionsListCardProps>(
  ({ exceptionsList, http, handleDelete, handleDuplicate, handleExport }) => {
    const [toggleStatus, setToggleStatus] = useState(false);
    const toggle = useCallback(() => {
      setToggleStatus(!toggleStatus);
    }, [toggleStatus]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onItemActionsClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    const onClosePopover = () => setIsPopoverOpen(false);

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            {
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup direction="column">
                      <EuiFlexItem>
                        <EuiFlexGroup>
                          <EuiFlexItem grow={false}>
                            <EuiFlexGroup direction="column">
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty
                                  flush={'left'}
                                >{`${exceptionsList.name}`}</EuiButtonEmpty>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiText size="xs">
                                  <EuiTextColor color="subdued">
                                    {exceptionsList.description}
                                  </EuiTextColor>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>{'created by: '}</EuiText>
                  </EuiFlexItem>
                  <StyledFlexItem grow={false}>
                    <EuiBadge>{exceptionsList.created_by}</EuiBadge>{' '}
                  </StyledFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>{'created on: '}</EuiText>
                  </EuiFlexItem>
                  <StyledFlexItem grow={false}>
                    <EuiBadge>{exceptionsList.created_at}</EuiBadge>
                  </StyledFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      button={
                        <EuiButtonIcon
                          isDisabled={false}
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
                            {'Delete exception list'}
                          </EuiContextMenuItem>,
                          <EuiContextMenuItem
                            key={'export'}
                            icon={'exportAction'}
                            onClick={() => {
                              onClosePopover();
                              handleExport({
                                id: exceptionsList.id,
                                listId: exceptionsList.list_id,
                                namespaceType: exceptionsList.namespace_type,
                              })();
                            }}
                          >
                            {'Export exception list'}
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            }
            {toggleStatus && (
              <EuiFlexItem grow={true}>
                {
                  <ExceptionsViewerItems
                    disableActions={!true} // !canUserCRUD
                    // showEmpty={loadingList}
                    // exceptions={exceptionItems}
                    onDeleteException={() => ''}
                    onEditExceptionItem={() => ''}
                    isReadOnly={false}
                    exceptions={[]}
                    listType={ExceptionListTypeEnum.DETECTION}
                    ruleReferences={null}
                    viewerState={null}
                    onCreateExceptionListItem={function (): void {
                      throw new Error('Function not implemented.');
                    }}
                  />
                }
              </EuiFlexItem>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionsListCard.displayName = 'ExceptionsListCard';
