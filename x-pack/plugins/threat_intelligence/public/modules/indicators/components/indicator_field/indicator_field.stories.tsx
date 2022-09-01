/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { generateFieldTypeMap } from '../../../../common/mocks/mock_field_type_map';
import { mockUiSettingsService } from '../../../../common/mocks/mock_kibana_ui_settings_service';
import { generateMockIndicator } from '../../../../../common/types/indicator';
import { IndicatorField } from './indicator_field';

export default {
  component: IndicatorField,
  title: 'IndicatorField',
};

const mockIndicator = generateMockIndicator();

const mockFieldTypesMap = generateFieldTypeMap();

export function Default() {
  const mockField = 'threat.indicator.ip';

  return (
    <IndicatorField indicator={mockIndicator} field={mockField} fieldTypesMap={mockFieldTypesMap} />
  );
}

export function IncorrectField() {
  const mockField = 'abc';

  return (
    <IndicatorField indicator={mockIndicator} field={mockField} fieldTypesMap={mockFieldTypesMap} />
  );
}

export function HandlesDates() {
  const KibanaReactContext = createKibanaReactContext({ uiSettings: mockUiSettingsService() });
  const mockField = 'threat.indicator.first_seen';

  return (
    <KibanaReactContext.Provider>
      <IndicatorField
        indicator={mockIndicator}
        field={mockField}
        fieldTypesMap={mockFieldTypesMap}
      />
    </KibanaReactContext.Provider>
  );
}
