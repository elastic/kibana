/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getUiSettings } from '../../../../../kibana_services';
import { StylePropEditor } from '../style_prop_editor';
import { DynamicIconForm } from './dynamic_icon_form';
import { StaticIconForm } from './static_icon_form';
import { SYMBOL_OPTIONS } from '../../symbol_utils';

export function VectorStyleIconEditor(props) {
  const iconForm = props.styleProperty.isDynamic() ? (
    <DynamicIconForm
      {...props}
      isDarkMode={getUiSettings().get('theme:darkMode', false)}
      symbolOptions={SYMBOL_OPTIONS}
    />
  ) : (
    <StaticIconForm
      {...props}
      isDarkMode={getUiSettings().get('theme:darkMode', false)}
      symbolOptions={SYMBOL_OPTIONS}
    />
  );

  return <StylePropEditor {...props}>{iconForm}</StylePropEditor>;
}
