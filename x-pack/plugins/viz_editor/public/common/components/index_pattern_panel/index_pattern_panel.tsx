/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiIcon, ICON_TYPES } from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import zipObject from 'lodash-es/zipObject';
import React, { useEffect, useState } from 'react';
import chrome from 'ui/chrome';
import { IndexPatternField, IndexPatterns } from '../../lib';
import { getIndexPatterns } from '../../lib/index_patterns';

interface Props {
  indexPatterns: IndexPatterns | null;
  onChangeIndexPatterns: (indexPatterns: IndexPatterns) => void;
}

interface State {
  selectedIndexPatternId: string;
}

function initialState(): State {
  const settingsClient = chrome.getUiSettingsClient();
  return {
    selectedIndexPatternId: settingsClient.get('defaultIndex') || '',
  };
}

function fieldSortFn(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name < fieldB.name ? -1 : 1;
}

export function IndexPatternPanel({ indexPatterns, onChangeIndexPatterns }: Props) {
  const [state, setState] = useState(() => initialState());

  useEffect(
    () => {
      if (indexPatterns) {
        return;
      }

      getIndexPatterns().then(loadedIndexPatterns => {
        if (!loadedIndexPatterns) {
          return;
        }

        onChangeIndexPatterns(
          zipObject(loadedIndexPatterns.map(({ id }) => id), loadedIndexPatterns)
        );

        setState({
          selectedIndexPatternId: state.selectedIndexPatternId || loadedIndexPatterns[0].id,
        });
      });
    },
    [indexPatterns]
  );

  if (!indexPatterns) {
    return <div>TODO... index pattern chooser...</div>;
  }

  const indexPattern = indexPatterns[state.selectedIndexPatternId];

  if (!indexPattern) {
    return <div>TODO... index pattern chooser...</div>;
  }

  const indexPatternsAsSelections = Object.values(indexPatterns).map(({ id, title }) => ({
    label: title,
    value: id,
  }));

  return (
    <>
      <EuiComboBox
        options={indexPatternsAsSelections}
        singleSelection={{ asPlainText: true }}
        selectedOptions={[{ label: indexPattern.title, value: state.selectedIndexPatternId }]}
        isClearable={false}
        onChange={([{ value }]) => {
          setState({
            ...state,
            selectedIndexPatternId: value as string,
          });
        }}
      />

      <div className="indexPatternPanel">
        {indexPattern.fields.sort(fieldSortFn).map(field => (
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
