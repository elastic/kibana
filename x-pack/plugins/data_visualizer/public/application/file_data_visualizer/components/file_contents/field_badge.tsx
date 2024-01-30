/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import React, { FC } from 'react';

interface Props {
  type: string;
  value: string;
}

const border = `1px solid #c5c5c5`;
const background = '#eaeaea';

export const FieldBadge: FC<Props> = ({ type, value }) => {
  return (
    <EuiBadge
      color={background}
      css={{
        marginRight: '2px',
        marginTop: '-4px',
        border,
        padding: '0px 6px',
        cursor: 'pointer',
      }}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <FieldIcon type={type} css={{ marginRight: '2px', marginTop: '1px', border }} />
        </EuiFlexItem>
        <EuiFlexItem>{value}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};
