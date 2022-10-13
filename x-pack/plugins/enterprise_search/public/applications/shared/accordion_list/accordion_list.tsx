/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTitle,
  IconType,
  useGeneratedHtmlId,
} from '@elastic/eui';

import './accordion_list.scss';

interface Props {
  hasBorder?: boolean;
  iconType: IconType;
  initialIsOpen?: boolean;
  items: string[];
  rowCount?: number;
  title: string;
}

export const AccordionList: React.FC<Props> = ({
  hasBorder,
  iconType,
  initialIsOpen,
  items,
  rowCount = 10,
  title,
}) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'accordionList',
  });

  const showPagination = items.length > rowCount;

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      arrowProps={{
        isDisabled: items.length === 0,
      }}
      className={hasBorder ? 'appSearchAccordion--bordered' : 'appSearchAccordion'}
      buttonContent={
        <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id={accordionId}
      extraAction={
        <EuiNotificationBadge color={items.length > 0 ? 'accent' : 'subdued'} size="m">
          {items.length}
        </EuiNotificationBadge>
      }
    >
      <EuiInMemoryTable
        items={items.map((item) => ({ item }))}
        columns={[
          {
            render: ({ item }: { item: string }) => item,
          },
        ]}
        pagination={
          showPagination
            ? {
                showPerPageOptions: false,
              }
            : false
        }
      />
      {!showPagination && <EuiSpacer size="s" />}
    </EuiAccordion>
  );
};
