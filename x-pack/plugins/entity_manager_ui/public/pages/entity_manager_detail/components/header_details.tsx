/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { Badges } from '../../../components/badges';
interface Props {
  definition: EntityDefinitionWithState;
}

export function HeaderDetails({ definition }: Props) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <Badges definition={definition} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
