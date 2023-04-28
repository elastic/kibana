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
import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';
import { SingleFieldSelect } from '../../../../../components/single_field_select';
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
  const geoFieldSelect = props.geoFields.length 
    ? <EuiFormRow
        label={i18n.translate('xpack.maps.spatialJoin.wizardForm.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.spatialJoin.wizardForm.geofieldPlaceholder', {
            defaultMessage: 'Select geo field',
          })}
          value={props.geoField ? props.geoField : null}
          onChange={props.onGeoFieldSelect}
          fields={props.geoFields}
          isClearable={false}
        />
      </EuiFormRow>
    : null;

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xxpack.maps.spatialJoin.wizardForm.rightSourceTitle', {
            defaultMessage: 'Join source',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.maps.spatialJoin.wizardForm.relationshipLabel', {
          defaultMessage: 'Relationship',
        })}
      >
        <RelationshipExpression distance={props.distance} onDistanceChange={props.onDistanceChange} />
      </EuiFormRow>

      <GeoIndexPatternSelect
        value={props.dataView ? props.dataView.id : ''}
        onChange={props.onDataViewSelect}
      />

      {geoFieldSelect}
    </EuiPanel>
  )
}