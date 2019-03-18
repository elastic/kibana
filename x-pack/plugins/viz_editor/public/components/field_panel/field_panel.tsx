/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, ICON_TYPES } from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import React from 'react';
import { DataSourceField } from '../../lib/es_data_source';

interface Props {
  fields: DataSourceField[];
  generateQuery: (field: DataSourceField) => any;
}

export function FieldPanel({ fields, generateQuery }: Props) {
  return (
    <div className="vzFieldPanel">
      {fields.map(field => (
        <button
          type="button"
          key={field.name}
          className={`vzFieldPanel-field vzFieldPanel-field-btn-${field.type}`}
          onDoubleClick={() => generateQuery(field)}
        >
          {fieldIcon(field)} <span className="vzFieldPanel-field-name">{field.name}</span>
        </button>
      ))}
    </div>
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

  return <EuiIcon type={iconType} color={colors[colorIndex]} className="vzFieldPanel-field-icon" />;
}
