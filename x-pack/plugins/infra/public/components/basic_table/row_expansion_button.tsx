/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';

export const RowExpansionButton = <Item extends any>({
  isExpanded,
  item,
  onCollapse,
  onExpand,
}: {
  isExpanded: boolean;
  item: Item;
  onCollapse: (item: Item) => void;
  onExpand: (item: Item) => void;
}) => {
  const handleClick = useCallback(() => (isExpanded ? onCollapse(item) : onExpand(item)), [
    isExpanded,
    item,
    onCollapse,
    onExpand,
  ]);

  return (
    <EuiButtonIcon
      onClick={handleClick}
      aria-label={isExpanded ? collapseAriaLabel : expandAriaLabel}
      iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
    />
  );
};

const collapseAriaLabel = i18n.translate('xpack.infra.table.collapseRowLabel', {
  defaultMessage: 'Collapse',
});

const expandAriaLabel = i18n.translate('xpack.infra.table.expandRowLabel', {
  defaultMessage: 'Expand',
});
