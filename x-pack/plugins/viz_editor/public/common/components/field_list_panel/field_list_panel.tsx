/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiIcon,
  // @ts-ignore
  EuiSuperSelect,
  ICON_TYPES,
} from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DatasourceField } from '../../../../common/datasource';
import { PanelComponentProps } from '../../../editor_plugin_registry';
import { Draggable } from '../../components/draggable';

interface State {
  fieldsFilter: string;
}

function initialState(): State {
  return {
    fieldsFilter: '',
  };
}

function sortFields(fieldA: DatasourceField, fieldB: DatasourceField) {
  return fieldA.name.toLowerCase() < fieldB.name.toLowerCase() ? -1 : 1;
}

export function FieldListPanel({ visModel }: PanelComponentProps) {
  const datasource = visModel.datasource;
  const [state, setState] = useState(() => initialState());

  function filterFields(field: DatasourceField) {
    return field.name.includes(state.fieldsFilter);
  }
  if (datasource === null) {
    return <div />;
  }

  return (
    <>
      {datasource && (
        <div className="fieldListPanel">
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.viz_editor.indexPatterns.filterByNameLabel', {
              defaultMessage: 'Search fields',
              description: 'Search the list of fields in the index pattern for the provided text',
            })}
            value={state.fieldsFilter}
            onChange={e => {
              setState({
                ...state,
                fieldsFilter: e.target.value,
              });
            }}
            aria-label="Search fields"
          />

          {datasource.fields
            .filter(filterFields)
            .sort(sortFields)
            .map(field => (
              <Draggable
                draggable={true}
                value={field}
                key={field.name}
                className={`fieldListPanel-field fieldListPanel-field-btn-${field.type}`}
              >
                {fieldIcon(field)} <span className="fieldListPanel-field-name">{field.name}</span>
              </Draggable>
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
