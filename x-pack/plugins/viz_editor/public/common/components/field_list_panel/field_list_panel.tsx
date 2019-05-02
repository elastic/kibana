/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiIcon,
  // @ts-ignore
  EuiHighlight,
  // @ts-ignore
  EuiSuperSelect,
  ICON_TYPES,
} from '@elastic/eui';
// @ts-ignore untyped dependency
import { palettes } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import classNames from 'classnames';
import { DatasourceField } from '../../../../common';
import { VisualizationPanelProps } from '../../../../public';
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

export function FieldListPanel({ visModel }: VisualizationPanelProps) {
  const datasource = visModel.datasource;
  const [state, setState] = useState(() => initialState());

  function filterFields(field: DatasourceField) {
    return field.name.toLowerCase().includes(state.fieldsFilter.toLowerCase());
  }
  if (datasource === null) {
    return <div />;
  }

  return (
    <>
      {datasource && (
        <div className="lnsFieldListPanel">
          <div className="lnsFieldListPanel__searchWrapper">
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
          </div>
          <div className="lnsFieldListPanel__list">
            <div className="lnsFieldListPanel__listOverflow">
              {datasource.fields
                .filter(filterFields)
                .sort(sortFields)
                .map(field => (
                  <Draggable
                    draggable={true}
                    value={field}
                    key={field.name}
                    className={`lnsFieldListPanel__field lnsFieldListPanel__field-btn-${field.type}`}
                  >
                    {fieldIcon(field)}
                    <span className="lnsFieldListPanel__fieldName" title={field.name}>
                      <EuiHighlight search={state.fieldsFilter.toLowerCase()}>
                        {field.name}
                      </EuiHighlight>
                    </span>
                  </Draggable>
                ))}
            </div>
          </div>
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
  const { colors } = palettes.euiPaletteColorBlind;
  const colorIndex = stringToNum(iconType) % colors.length;

  const classes = classNames(
    'lnsFieldListPanel__fieldIcon',
    `lnsFieldListPanel__fieldIcon--${type}`
  );

  return (
    <EuiIcon type={iconType} color={colors[colorIndex]} className={classes} />
  );
}
