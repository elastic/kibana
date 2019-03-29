/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
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
import { PanelComponentProps } from '../../../editor_plugin_registry';
import { Field } from '../../lib';

interface State {
  fieldsFilter: string;
}

function initialState(): State {
  return {
    fieldsFilter: '',
  };
}

function sortFields(fieldA: Field, fieldB: Field) {
  return fieldA.name < fieldB.name ? -1 : 1;
}

export function FieldListPanel({
  visModel,
  onChangeVisModel,
  getSuggestionsForField,
}: PanelComponentProps) {
  const datasource = visModel.datasource;
  const [state, setState] = useState(() => initialState());

  function filterFields(field: Field) {
    return field.name.includes(state.fieldsFilter);
  }
  if (datasource === null) {
    return <div />;
  }

  const handleFieldClick = (field: Field) => {
    return () => {
      if (!getSuggestionsForField) {
        return;
      }

      const suggestions = getSuggestionsForField(datasource.id, field, visModel);

      if (suggestions.length) {
        onChangeVisModel(suggestions[0].visModel);
      }
    };
  };

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
              <div
                // type="div"
                key={field.name}
                className={`fieldListPanel-field fieldListPanel-field-btn-${field.type}`}
              >
                {fieldIcon(field)} <span className="fieldListPanel-field-name">{field.name}</span>
                <div>
                  <EuiButton
                    size="s"
                    onClick={handleFieldClick(field)}
                    iconType="plusInCircleFilled"
                  />
                </div>
              </div>
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
