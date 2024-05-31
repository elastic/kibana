/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  items: string[];
  multipleItemsMessage?: string;
}
export function ItemsBadge({
  items = [],
  multipleItemsMessage = i18n.translate('xpack.apm.itemsBadge.placeholder', {
    values: { itemsCount: items.length },
    defaultMessage: '{itemsCount, plural, one {1 item} other {# items}}',
  }),
}: Props) {
  if (items.length < 2) {
    return (
      <>
        {items.map((item) => (
          <EuiBadge color="hollow" key={item}>
            {item}
          </EuiBadge>
        ))}
      </>
    );
  }
  return (
    <EuiToolTip
      position="right"
      content={items.map((item) => (
        <React.Fragment key={item}>
          {item}
          <br />
        </React.Fragment>
      ))}
    >
      <EuiBadge>{multipleItemsMessage}</EuiBadge>
    </EuiToolTip>
  );
}
