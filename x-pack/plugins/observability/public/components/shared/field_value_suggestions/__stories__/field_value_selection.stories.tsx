/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { Observable } from 'rxjs';
import { CoreStart } from 'src/core/public';
import { text } from '@storybook/addon-knobs';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { FieldValueSelectionProps } from '../types';
import { FieldValueSelection } from '../field_value_selection';

const KibanaReactContext = createKibanaReactContext(({
  uiSettings: { get: () => {}, get$: () => new Observable() },
} as unknown) as Partial<CoreStart>);

export default {
  title: 'app/Shared/FieldValueSuggestions',
  component: FieldValueSelection,
  decorators: [
    (Story: ComponentType<FieldValueSelectionProps>) => (
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <EuiThemeProvider>
            <FieldValueSelection
              label="Service name"
              values={['elastic co frontend', 'apm server', 'opbean python']}
              onChange={() => {}}
              selectedValue={[]}
              loading={false}
              setQuery={() => {}}
            />
          </EuiThemeProvider>
        </KibanaReactContext.Provider>
      </IntlProvider>
    ),
  ],
};

export function ValuesLoaded() {
  return (
    <FieldValueSelection
      label="Service name"
      values={['elastic co frontend', 'apm server', 'opbean python']}
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
      values={['elastic co frontend', 'apm server', 'opbean python']}
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
      values={['elastic co frontend', 'apm server', 'opbean python']}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={setQuery}
    />
  );
}
