/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { GRID_RESOLUTION } from '../../../../common/constants';
import { EuiSelect, EuiFormRow, EuiCallOut } from '@elastic/eui';
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
        defaultMessage: 'super fine',
      }),
    });
  }

  let mvtCallout = null;
  if (resolution === GRID_RESOLUTION.SUPER_FINE) {
    mvtCallout = (
      <EuiFormRow label={' '} display="columnCompressed">
        <EuiCallOut>
          {i18n.translate('xpack.maps.resolution.mvtCallout', {
            defaultMessage:
              'This setting generates clusters at a high resolution, using Elasticsearch vector tiles. Some layer-settings are not compatible with this selection and will be disabled.',
          })}
        </EuiCallOut>
      </EuiFormRow>
    );
  }
  return (
    <Fragment>
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
      {mvtCallout}
    </Fragment>
  );
}
