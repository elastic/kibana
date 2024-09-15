/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface RowsPerPageProps {
  perPage?: number;
  itemsPerPage?: number[];
  onPerPageChange: (perPage: number) => void;
}

export function RowsPerPage({
  onPerPageChange,
  perPage = 10,
  itemsPerPage = [10, 20, 50],
}: RowsPerPageProps) {
  const [isPopoverOpen, setPopover] = useState(false);

  const singleContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'singleContextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const isSelectedProps = (size: number) => {
    return size === perPage
      ? { icon: 'check', 'aria-current': true }
      : { icon: 'empty', 'aria-current': false };
  };

  const button = (
    <EuiButtonEmpty
      data-test-subj="entityManagerRowsPerPageButton"
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      color="text"
    >
      {i18n.translate('xpack.entityManager.rowsPerPage.buttonLabel', {
        defaultMessage: 'Rows per page: {perPage}',
        values: { perPage },
      })}
    </EuiButtonEmpty>
  );

  const items = itemsPerPage.map((page) => (
    <EuiContextMenuItem
      {...isSelectedProps(page)}
      key={`${page} rows`}
      onClick={() => {
        closePopover();
        onPerPageChange(page);
      }}
    >
      {i18n.translate('xpack.entityManager.rowsPerPage.contextMenuLabel', {
        defaultMessage: '{pagePer} rows',
        values: { pagePer: page },
      })}
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      id={singleContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="upCenter"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
}
