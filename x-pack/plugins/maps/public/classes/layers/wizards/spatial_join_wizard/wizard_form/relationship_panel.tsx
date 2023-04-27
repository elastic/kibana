/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { DistanceForm } from './distance_form';

interface Props {
  distance: number | string;
  isDistanceInvalid: boolean;
  onDistanceChange: (distance: number | string) => void;
}

export function RelationshipPanel(props: Props) {
  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.maps.spatialJoin.wizard.relationshipTitle', {
            defaultMessage: 'Relationship',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <DistanceForm distance={props.distance} isDistanceInvalid={props.isDistanceInvalid} onDistanceChange={props.onDistanceChange} />

    </EuiPanel>
  )
}