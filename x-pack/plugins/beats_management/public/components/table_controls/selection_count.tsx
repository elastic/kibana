/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

interface SelectionCountProps {
  selectionCount: number;
}

export const SelectionCount = (props: SelectionCountProps) => (
  <div>
    {props.selectionCount}
    <FormattedMessage
      id="xpack.beatsManagement.tableControls.selectionItemsCountText"
      defaultMessage="item{selectionCount, plural, one {} other {s}}"
      values={{
        selectionCount: props.selectionCount,
      }}
    />
    <FormattedMessage
      id="xpack.beatsManagement.tableControls.selectionCountSelectedText"
      defaultMessage="selected"
    />
  </div>
);
