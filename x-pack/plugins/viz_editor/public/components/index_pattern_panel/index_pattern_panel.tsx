/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiIcon, ICON_TYPES } from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import React, { useState } from 'react';
import { IndexPatterns } from '../../lib';

interface Props {
  indexPatterns: IndexPatterns;
}

interface State {
  indexPattern?: string;
}

function initialState(indexPatterns: IndexPatterns): State {
  return {
    indexPattern: Object.keys(indexPatterns)[0],
  };
}

export function IndexPatternPanel({ indexPatterns }: Props) {
  const [state] = useState(() => initialState(indexPatterns));
  const indexPattern = state.indexPattern ? indexPatterns[state.indexPattern] : undefined;

  if (!indexPattern) {
    return <div>TODO... index pattern chooser...</div>;
  }

  return (
    <>
      <EuiButtonEmpty className="vzDataSource-link" size="l">
        {indexPattern.title}
      </EuiButtonEmpty>
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
