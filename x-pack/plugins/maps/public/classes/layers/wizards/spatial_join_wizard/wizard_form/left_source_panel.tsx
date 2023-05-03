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
import { SingleFieldSelect } from '../../../../../components/single_field_select';

interface Props {
  dataView?: DataView;
  geoField: string | undefined;
  geoFields: DataViewField[];
  onDataViewSelect: (dataView: DataView) => void;
  onGeoFieldSelect: (fieldName?: string) => void;
}

export function LeftSourcePanel(props: Props) {
  const geoFieldSelect = props.geoFields.length ? (
    <EuiFormRow
      label={i18n.translate('xpack.maps.spatialJoin.wizard.geofieldLabel', {
        defaultMessage: 'Geospatial field',
      })}
    >
      <SingleFieldSelect
        placeholder={i18n.translate('xpack.maps.choropleth.geofieldPlaceholder', {
          defaultMessage: 'Select geo field',
        })}
        value={props.geoField ? props.geoField : null}
        onChange={props.onGeoFieldSelect}
        fields={props.geoFields}
        isClearable={false}
      />
    </EuiFormRow>
  ) : null;

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.maps.spatialJoin.wizard.leftSourceTitle', {
            defaultMessage: 'Vector features source',
          })}
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <GeoIndexPatternSelect
        dataView={props.dataView}
        onChange={props.onDataViewSelect}
        isGeoPointsOnly={true}
      />

      {geoFieldSelect}
    </EuiPanel>
  );
}
