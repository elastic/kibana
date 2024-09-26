/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Transform } from './transform';

interface TransformsProps {
  definition: EntityDefinitionWithState;
}

export function Transforms({ definition }: TransformsProps) {
  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.entityManager.transforms.h2.transformsLabel', {
            defaultMessage: 'Transforms',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <Transform definition={definition} type="history" />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <Transform definition={definition} type="latest" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
