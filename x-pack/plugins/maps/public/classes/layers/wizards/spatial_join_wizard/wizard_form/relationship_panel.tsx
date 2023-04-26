/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  distance: number;
  onDistanceChange: (distance: number) => void;
}

export function RelationshipPanel(props: Props) {
  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xxpack.maps.spatialJoin.wizard.relationshipTitle', {
            defaultMessage: 'Relationship',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

    </EuiPanel>
  )
}