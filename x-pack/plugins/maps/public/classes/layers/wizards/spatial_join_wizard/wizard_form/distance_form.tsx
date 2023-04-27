/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiFormRow,
} from '@elastic/eui';

interface Props {
  distance: number | string;
  onDistanceChange: (distance: number | string) => void;
}

export function DistanceForm(props: Props) {
  const [isInvalid, setIsInvalid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const distanceAsNumber = typeof props.distance === 'string' ? parseFloat(props.distance as string) : props.distance;
    if (isNaN(distanceAsNumber)) {
      setIsInvalid(true);
      return;
    }

    if (distanceAsNumber <= 0) {
      setIsInvalid(true);
      return;
    }

    setIsInvalid(false);
  }, [props.distance, setIsInvalid]);
  
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.spatialJoin.wizardForm.distanceLabel', {
        defaultMessage: 'Distance',
      })}
      isInvalid={isInvalid}
      error={isInvalid ? [i18n.translate('xpack.maps.spatialJoin.wizardForm.invalidDistanceMessage', {
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
        isInvalid={isInvalid}
        min={0}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          props.onDistanceChange(e.target.value);
        }}
        value={props.distance}
      />
    </EuiFormRow>
  )
}