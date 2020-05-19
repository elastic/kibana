/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiTextColor, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GeoFieldWithIndex } from './geo_field_with_index';

const OPTION_ID_DELIMITER = '/';

function createOptionId(geoField: GeoFieldWithIndex): string {
  // Namespace field with indexPatterId to avoid collisions between field names
  return `${geoField.indexPatternId}${OPTION_ID_DELIMITER}${geoField.geoFieldName}`;
}

function splitOptionId(optionId: string) {
  const split = optionId.split(OPTION_ID_DELIMITER);
  return {
    indexPatternId: split[0],
    geoFieldName: split[1],
  };
}

interface Props {
  fields: GeoFieldWithIndex[];
  onChange: (newSelectedField: GeoFieldWithIndex | undefined) => void;
  selectedField: GeoFieldWithIndex | undefined;
}

export function MultiIndexGeoFieldSelect({ fields, onChange, selectedField }: Props) {
  function onFieldSelect(selectedOptionId: string) {
    const { indexPatternId, geoFieldName } = splitOptionId(selectedOptionId);

    const newSelectedField = fields.find((field) => {
      return field.indexPatternId === indexPatternId && field.geoFieldName === geoFieldName;
    });
    onChange(newSelectedField);
  }

  const options = fields.map((geoField: GeoFieldWithIndex) => {
    return {
      inputDisplay: (
        <EuiText size="s">
          <EuiTextColor color="subdued">
            <small>{geoField.indexPatternTitle}</small>
          </EuiTextColor>
          <br />
          {geoField.geoFieldName}
        </EuiText>
      ),
      value: createOptionId(geoField),
    };
  });

  return (
    <EuiFormRow
      className="mapGeometryFilter__geoFieldSuperSelectWrapper"
      label={i18n.translate('xpack.maps.multiIndexFieldSelect.fieldLabel', {
        defaultMessage: 'Filtering field',
      })}
      display="rowCompressed"
    >
      <EuiSuperSelect
        className="mapGeometryFilter__geoFieldSuperSelect"
        options={options}
        valueOfSelected={selectedField ? createOptionId(selectedField) : ''}
        onChange={onFieldSelect}
        hasDividers={true}
        fullWidth={true}
        compressed={true}
        itemClassName="mapGeometryFilter__geoFieldItem"
      />
    </EuiFormRow>
  );
}
