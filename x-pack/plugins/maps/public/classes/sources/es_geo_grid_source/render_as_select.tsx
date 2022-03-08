/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPE, RENDER_AS } from '../../../../common/constants';
import { getIsCloud } from '../../../kibana_services';
import { getIsGoldPlus } from '../../../licensed_features';

interface Props {
  geoFieldType?: ES_GEO_FIELD_TYPE;
  renderAs: RENDER_AS;
  onChange: (newValue: RENDER_AS) => void;
  isColumnCompressed?: boolean;
}

export function RenderAsSelect(props: Props) {
  if (props.renderAs === RENDER_AS.HEATMAP) {
    return null;
  }

  let isHexDisabled = false;
  let hexDisabledReason = '';
  if (!getIsCloud() && !getIsGoldPlus()) {
    isHexDisabled = true;
    hexDisabledReason = i18n.translate('xpack.maps.hexbin.license.disabledReason', {
      defaultMessage: 'Hexbins require a Gold license.',
    });
  } else if (props.geoFieldType !== ES_GEO_FIELD_TYPE.GEO_POINT) {
    isHexDisabled = true;
    hexDisabledReason = i18n.translate('xpack.maps.hexbin.geoShape.disabledReason', {
      defaultMessage: `Hexbins require 'geo_point' clustering field.`,
    });
  }

  const options = [
    {
      id: RENDER_AS.POINT,
      label: i18n.translate('xpack.maps.source.esGeoGrid.pointsDropdownOption', {
        defaultMessage: 'clusters',
      }),
      value: RENDER_AS.POINT,
    },
    {
      id: RENDER_AS.GRID,
      label: i18n.translate('xpack.maps.source.esGeoGrid.gridRectangleDropdownOption', {
        defaultMessage: 'grids',
      }),
      value: RENDER_AS.GRID,
    },
    {
      id: RENDER_AS.HEX,
      label: i18n.translate('xpack.maps.source.esGeoGrid.hexDropdownOption', {
        defaultMessage: 'hexbins',
      }),
      value: RENDER_AS.HEX,
      isDisabled: isHexDisabled,
    },
  ];

  function onChange(id: string) {
    const data = options.find((option) => option.id === id);
    if (data) {
      props.onChange(data.value as RENDER_AS);
    }
  }

  const currentOption = options.find((option) => option.value === props.renderAs) || options[0];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.source.esGeoGrid.showAsLabel', {
        defaultMessage: 'Show as',
      })}
      helpText={hexDisabledReason}
      display={props.isColumnCompressed ? 'columnCompressed' : 'row'}
    >
      <EuiButtonGroup
        type="single"
        legend={i18n.translate('xpack.maps.source.esGeoGrid.showAsSelector', {
          defaultMessage: 'Choose the display method',
        })}
        options={options}
        idSelected={currentOption.id}
        onChange={onChange}
        isFullWidth={true}
        buttonSize="compressed"
      />
    </EuiFormRow>
  );
}
