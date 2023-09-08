/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { Fragment } from 'react';
import { Maybe } from '../../../../typings/common';
import { useBreakpoints } from '../../../hooks/use_breakpoints';

interface Props {
  items: Array<Maybe<React.ReactElement>>;
}

function Summary({ items }: Props) {
  const filteredItems = items.filter(Boolean) as React.ReactElement[];
  const { isSmall } = useBreakpoints();

  return (
    <EuiFlexGroup gutterSize="s" direction="row" wrap alignItems="center">
      {filteredItems.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && !isSmall && <EuiFlexItem grow={false}>|</EuiFlexItem>}
          <EuiFlexItem grow={false}>{item}</EuiFlexItem>
        </Fragment>
      ))}
    </EuiFlexGroup>
  );
}

export { Summary };
