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
    <FormattedMessage
      id="xpack.beatsManagement.tableControls.selectionItemsCountText"
      defaultMessage="{selectionCount, plural, one {# item} other {# items}} selected"
      values={{
        selectionCount: props.selectionCount,
      }}
    />
  </div>
);
