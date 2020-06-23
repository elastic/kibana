/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';

export enum DISPLAY {
  CHOROPLETH = 'CHOROPLETH',
  CLUSTERS = 'CLUSTERS',
  GRIDS = 'GRIDS',
  HEATMAP = 'HEATMAP',
}

const DISPLAY_OPTIONS = [
  {
    value: DISPLAY.CHOROPLETH,
    text: i18n.translate('xpack.maps.observability.choroplethLabel', {
      defaultMessage: 'World boundaries',
    }),
  },
  {
    value: DISPLAY.CLUSTERS,
    text: i18n.translate('xpack.maps.observability.clustersLabel', {
      defaultMessage: 'Clusters',
    }),
  },
  {
    value: DISPLAY.GRIDS,
    text: i18n.translate('xpack.maps.observability.gridsLabel', {
      defaultMessage: 'Grids',
    }),
  },
  {
    value: DISPLAY.HEATMAP,
    text: i18n.translate('xpack.maps.observability.heatMapLabel', {
      defaultMessage: 'Heat map',
    }),
  },
];

interface Props {
  layer: OBSERVABILITY_LAYER_TYPE | null;
  value: DISPLAY;
  onChange: (display: DISPLAY) => void;
}

export function DisplaySelect(props: Props) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    props.onChange(event.target.value as DISPLAY);
  }

  if (!props.layer) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.observability.displayLabel', {
        defaultMessage: 'Display',
      })}
    >
      <EuiSelect options={DISPLAY_OPTIONS} value={props.value} onChange={onChange} />
    </EuiFormRow>
  );
}
