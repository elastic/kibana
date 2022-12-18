/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Maybe } from '../../../../typings/common';

interface Props {
  items: Array<Maybe<React.ReactElement>>;
}

function Summary({ items }: Props) {
  const filteredItems = items.filter(Boolean) as React.ReactElement[];

  return (
    <EuiFlexGroup gutterSize="s" direction="row">
      {filteredItems.map((item, index) => (
        <>
          {index > 0 && (
            <EuiFlexItem key={index} grow={false}>
              |
            </EuiFlexItem>
          )}
          <EuiFlexItem key={index} grow={false}>
            {item}
          </EuiFlexItem>
        </>
      ))}
    </EuiFlexGroup>
  );
}

export { Summary };
