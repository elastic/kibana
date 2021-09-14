/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GRID_RESOLUTION } from '../../../../common/constants';
import { EuiSelect, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const BASE_OPTIONS = [
  {
    value: GRID_RESOLUTION.COARSE,
    text: i18n.translate('xpack.maps.source.esGrid.coarseDropdownOption', {
      defaultMessage: 'coarse',
    }),
  },
  {
    value: GRID_RESOLUTION.FINE,
    text: i18n.translate('xpack.maps.source.esGrid.fineDropdownOption', {
      defaultMessage: 'fine',
    }),
  },
  {
    value: GRID_RESOLUTION.MOST_FINE,
    text: i18n.translate('xpack.maps.source.esGrid.finestDropdownOption', {
      defaultMessage: 'finest',
    }),
  },
];

export function ResolutionEditor({ resolution, onChange, includeSuperFine }) {
  const options = [...BASE_OPTIONS];

  if (includeSuperFine) {
    options.push({
      value: GRID_RESOLUTION.SUPER_FINE,
      text: i18n.translate('xpack.maps.source.esGrid.superFineDropDownOption', {
        defaultMessage: 'super fine (beta)',
      }),
    });
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.geoGrid.resolutionLabel', {
        defaultMessage: 'Grid resolution',
      })}
      display="columnCompressed"
    >
      <EuiSelect
        options={options}
        value={resolution}
        onChange={(e) => onChange(e.target.value)}
        compressed
      />
    </EuiFormRow>
  );
}
