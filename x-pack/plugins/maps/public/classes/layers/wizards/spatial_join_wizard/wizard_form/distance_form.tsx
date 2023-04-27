/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiFormRow,
} from '@elastic/eui';

interface Props {
  distance: number | string;
  isDistanceInvalid: boolean;
  onDistanceChange: (distance: number | string) => void;
}

export function DistanceForm(props: Props) {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.spatialJoin.wizardForm.distanceLabel', {
        defaultMessage: 'Distance',
      })}
      isInvalid={props.isDistanceInvalid}
      error={props.isDistanceInvalid ? [i18n.translate('xpack.maps.spatialJoin.wizardForm.invalidDistanceMessage', {
        defaultMessage: 'Must be a number greater than 0',
      })] : []}
    >
      <EuiFieldNumber
        append={i18n.translate('xpack.maps.spatialJoin.wizardForm.kilometersAbbreviation', {
          defaultMessage: 'km',
        })}
        aria-label={i18n.translate('xpack.maps.spatialJoin.wizardForm.distanceInputAriaLabel', {
          defaultMessage: 'distance input',
        })}
        isInvalid={props.isDistanceInvalid}
        min={0}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          props.onDistanceChange(e.target.value);
        }}
        value={props.distance}
      />
    </EuiFormRow>
  )
}