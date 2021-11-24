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
  EuiTitle,
  IconType,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface Props {
  iconType: IconType;
  items: string[];
  title: string;
}

export const AccordionList: React.FC<Props> = ({ iconType, items, title }) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'accordionList',
  });

  return (
    <EuiAccordion
      arrowProps={{
        isDisabled: items.length === 0,
      }}
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
      extraAction={<EuiNotificationBadge size="m">{items.length}</EuiNotificationBadge>}
    >
      <EuiInMemoryTable
        items={items.map((item) => ({ item }))}
        columns={[
          {
            render: ({ item }: { item: string }) => item,
          },
        ]}
        pagination={{
          hidePerPageOptions: true,
        }}
      />
    </EuiAccordion>
  );
};
