/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export enum OBSERVABILITY_LAYER_TYPE {
  APM_RUM_PERFORMANCE = 'APM_RUM_PERFORMANCE',
  APM_RUM_TRAFFIC = 'APM_RUM_TRAFFIC',
}

const OBSERVABILITY_LAYER_OPTIONS = [
  {
    value: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
    text: i18n.translate('xpack.maps.observability.apmRumPerformanceLabel', {
      defaultMessage: 'APM RUM Performance',
    }),
  },
  {
    value: OBSERVABILITY_LAYER_TYPE.APM_RUM_TRAFFIC,
    text: i18n.translate('xpack.maps.observability.apmRumTrafficLabel', {
      defaultMessage: 'APM RUM Traffic',
    }),
  },
];

interface Props {
  value: OBSERVABILITY_LAYER_TYPE | null;
  onChange: (layer: OBSERVABILITY_LAYER_TYPE) => void;
}

export function LayerSelect(props: Props) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    props.onChange(event.target.value as OBSERVABILITY_LAYER_TYPE);
  }

  const options = props.value
    ? OBSERVABILITY_LAYER_OPTIONS
    : [{ value: '', text: '' }, ...OBSERVABILITY_LAYER_OPTIONS];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.observability.layerLabel', {
        defaultMessage: 'Layer',
      })}
    >
      <EuiSelect options={options} value={props.value ? props.value : ''} onChange={onChange} />
    </EuiFormRow>
  );
}
