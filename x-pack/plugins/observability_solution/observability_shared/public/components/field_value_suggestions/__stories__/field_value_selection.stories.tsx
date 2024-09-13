/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useEffect, useState } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Observable } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import { text } from '@storybook/addon-knobs';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { FieldValueSelectionProps } from '../types';
import { FieldValueSelection } from '../field_value_selection';

const values = [
  { label: 'elastic co frontend', count: 1 },
  { label: 'apm server', count: 2 },
];

const KibanaReactContext = createKibanaReactContext({
  uiSettings: { get: () => {}, get$: () => new Observable() },
} as unknown as Partial<CoreStart>);

export default {
  title: 'app/Shared/FieldValueSuggestions',
  component: FieldValueSelection,
  decorators: [
    (Story: ComponentType<FieldValueSelectionProps>) => (
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <FieldValueSelection
            label="Service name"
            values={values}
            onChange={() => {}}
            selectedValue={[]}
            loading={false}
            setQuery={() => {}}
          />
        </KibanaReactContext.Provider>
      </IntlProvider>
    ),
  ],
};

export function ValuesLoaded() {
  return (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={() => {}}
    />
  );
}

export function LoadingState() {
  return (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={true}
      setQuery={() => {}}
    />
  );
}

export function EmptyState() {
  return (
    <FieldValueSelection
      label="Service name"
      values={[]}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={() => {}}
    />
  );
}

export function SearchState(args: FieldValueSelectionProps) {
  const name = text('Query', '');

  const [, setQuery] = useState('');
  useEffect(() => {
    setQuery(name);
  }, [name]);

  return (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={setQuery}
    />
  );
}
