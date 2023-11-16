/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';
import { GeoFieldSelect } from '../../../../../components/geo_field_select';
import { inputStrings } from '../../../../../connected_components/input_strings';
import { RelationshipExpression } from './relationship_expression';

interface Props {
  dataView?: DataView;
  distance: number;
  geoField: string | undefined;
  geoFields: DataViewField[];
  onDataViewSelect: (dataView: DataView) => void;
  onDistanceChange: (distance: number) => void;
  onGeoFieldSelect: (fieldName?: string) => void;
}

export function RightSourcePanel(props: Props) {
  const geoFieldSelect = props.dataView ? (
    <GeoFieldSelect
      value={props.geoField ? props.geoField : ''}
      onChange={props.onGeoFieldSelect}
      geoFields={props.geoFields}
      isClearable={false}
    />
  ) : null;

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.maps.spatialJoin.wizardForm.rightSourceTitle', {
            defaultMessage: 'Join source',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow label={inputStrings.relationshipLabel}>
        <RelationshipExpression
          distance={props.distance}
          onDistanceChange={props.onDistanceChange}
        />
      </EuiFormRow>

      <GeoIndexPatternSelect dataView={props.dataView} onChange={props.onDataViewSelect} />

      {geoFieldSelect}
    </EuiPanel>
  );
}
