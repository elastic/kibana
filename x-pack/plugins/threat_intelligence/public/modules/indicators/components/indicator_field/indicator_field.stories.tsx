/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { generateMockIndicator } from '../../../../../common/types/indicator';
import { IndicatorField } from './indicator_field';

export default {
  component: IndicatorField,
  title: 'IndicatorField',
};

const mockIndicator = generateMockIndicator();
const mockFieldTypesMap: { [id: string]: string } = {
  'threat.indicator.ip': 'ip',
  'threat.indicator.first_seen': 'date',
};

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
  const coreMock = {
    uiSettings: {
      get: (key: string) => {
        const settings = {
          [DEFAULT_DATE_FORMAT]: '',
          [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
        };
        // @ts-expect-error
        return settings[key];
      },
    },
  } as unknown as CoreStart;
  const KibanaReactContext = createKibanaReactContext(coreMock);

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
