/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';

interface Props {
  dataView?: DataView;
  onDataViewSelect: (dataView: DataView) => void;
}

export function LeftSourcePanel(props: Props) {
  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xxpack.maps.spatialJoin.wizard.leftSourceTitle', {
            defaultMessage: 'Features',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <GeoIndexPatternSelect
          value={props.dataView ? props.dataView.id : ''}
          onChange={props.onDataViewSelect}
          isGeoPointsOnly={true}
        />
    </EuiPanel>
  )
}