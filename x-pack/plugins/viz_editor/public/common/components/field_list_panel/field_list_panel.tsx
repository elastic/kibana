/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  // @ts-ignore
  EuiSuperSelect,
  ICON_TYPES,
} from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import React, { useEffect, useState } from 'react';
import { Datasources } from '../../lib';

interface State {
  selectedDatasourceId: string;
}

interface Props {
  datasources: Datasources | null;
}

function initialState(): State {
  return {
    selectedDatasourceId: '',
  };
}

export function FieldListPanel({ datasources }: Props) {
  const [state, setState] = useState(() => initialState());

  useEffect(
    () => {
      if (Object.keys(datasources || {}).length === 1) {
        setState({ selectedDatasourceId: Object.values(datasources || {})[0].id });
      }
    },
    [datasources]
  );

  if (!datasources) {
    return <div />;
  }

  const currentDatasource = datasources[state.selectedDatasourceId];
  const indexPatternNames = Object.values(datasources).map(({ id, title }) => ({
    text: title,
    value: id,
    inputDisplay: title,
  }));

  return (
    <>
      <EuiSuperSelect
        options={indexPatternNames}
        valueOfSelected={state.selectedDatasourceId}
        onChange={(value: string) => {
          setState({
            ...state,
            selectedDatasourceId: value,
          });
        }}
      />

      {currentDatasource && (
        <div className="fieldListPanel">
          {currentDatasource.fields.map(field => (
            <button
              type="button"
              key={field.name}
              className={`fieldListPanel-field fieldListPanel-field-btn-${field.type}`}
            >
              {fieldIcon(field)} <span className="fieldListPanel-field-name">{field.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function stringToNum(s: string) {
  // tslint:disable-next-line:no-bitwise
  return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 1);
}

function fieldIcon({ type }: { type: string }): any {
  const icons: any = {
    geo_point: 'globe',
    boolean: 'invert',
    date: 'calendar',
  };

  const iconType = icons[type] || ICON_TYPES.find(t => t === type) || 'empty';
  const { colors } = palettes.euiPaletteForDarkBackground;
  const colorIndex = stringToNum(iconType) % colors.length;

  return (
    <EuiIcon type={iconType} color={colors[colorIndex]} className="fieldListPanel-field-icon" />
  );
}
