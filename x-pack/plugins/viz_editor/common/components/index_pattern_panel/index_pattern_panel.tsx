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
import zipObject from 'lodash-es/zipObject';
import React, { useEffect, useState } from 'react';
import chrome from 'ui/chrome';
import { IndexPatterns } from '../../lib';
import { getIndexPatterns } from '../../lib/index_patterns';

interface State {
  selectedIndexName: string;
  indexPatterns: IndexPatterns | null;
}

function initialState(): State {
  const settingsClient = chrome.getUiSettingsClient();
  return {
    selectedIndexName: settingsClient.get('defaultIndex') || '',
    indexPatterns: null,
  };
}

function getIndexPatternFromName(state: State, title: string) {
  if (!state.indexPatterns) {
    return null;
  }

  return Object.values(state.indexPatterns).find(indexPattern => {
    return indexPattern.title === title;
  });
}

export function IndexPatternPanel() {
  const [state, setState] = useState(() => initialState());

  useEffect(() => {
    if (state.indexPatterns) {
      return;
    }

    getIndexPatterns().then(indexPatterns => {
      if (!indexPatterns) {
        return;
      }

      setState({
        selectedIndexName: state.selectedIndexName || indexPatterns[0].title,
        indexPatterns: zipObject(indexPatterns.map(({ id }) => id), indexPatterns),
      });
    });
  });

  const indexPattern = getIndexPatternFromName(state, state.selectedIndexName);

  if (!indexPattern || !state.indexPatterns) {
    return <div>TODO... index pattern chooser...</div>;
  }

  const indexPatternNames = Object.values(state.indexPatterns).map(({ title }) => ({
    text: title,
    value: title,
    inputDisplay: title,
  }));

  return (
    <>
      <EuiSuperSelect
        options={indexPatternNames}
        valueOfSelected={state.selectedIndexName}
        onChange={(value: string) => {
          setState({
            ...state,
            selectedIndexName: value,
          });
        }}
      />

      <div className="indexPatternPanel">
        {indexPattern.fields.map(field => (
          <button
            type="button"
            key={field.name}
            className={`indexPatternPanel-field indexPatternPanel-field-btn-${field.type}`}
          >
            {fieldIcon(field)} <span className="indexPatternPanel-field-name">{field.name}</span>
          </button>
        ))}
      </div>
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
    <EuiIcon type={iconType} color={colors[colorIndex]} className="indexPatternPanel-field-icon" />
  );
}
