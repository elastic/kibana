/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { IconMapSelect } from './icon_map_select';

export function DynamicIconForm({
  fields,
  isDarkMode,
  onDynamicStyleChange,
  staticDynamicSelect,
  styleProperty,
  symbolOptions,
}) {
  const styleOptions = styleProperty.getOptions();

  const onFieldChange = ({ field }) => {
    const { name, origin } = field;
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      field: { name, origin },
    });
  };

  const onIconMapChange = (newOptions) => {
    onDynamicStyleChange(styleProperty.getStyleName(), {
      ...styleOptions,
      ...newOptions,
    });
  };

  function renderIconMapSelect() {
    const field = styleProperty.getField();
    if (!field) {
      return null;
    }

    return (
      <IconMapSelect
        {...styleOptions}
        useCustomIconMap={_.get(styleOptions, 'useCustomColorRamp', false)}
        styleProperty={styleProperty}
        onChange={onIconMapChange}
        isDarkMode={isDarkMode}
        symbolOptions={symbolOptions}
        isCustomOnly={!field.supportsAutoDomain()}
      />
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
          {staticDynamicSelect}
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            styleName={styleProperty.getStyleName()}
            fields={fields}
            selectedFieldName={_.get(styleOptions, 'field.name')}
            onChange={onFieldChange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {renderIconMapSelect()}
    </Fragment>
  );
}
