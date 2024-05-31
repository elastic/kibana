/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useMemo } from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';

export function NarrowByMapBounds(props: Omit<NarrowByFieldProps, 'switchLabel' | 'fieldTypes'>) {
  return (
    <NarrowByField
      switchLabel={i18n.translate('xpack.maps.esqlSource.narrowByMapExtentLabel', {
        defaultMessage: 'Dynamically filter for data in the visible map area',
      })}
      fieldTypes={[ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE]}
      {...props}
    />
  );
}

export function NarrowByTime(props: Omit<NarrowByFieldProps, 'switchLabel' | 'fieldTypes'>) {
  return (
    <NarrowByField
      switchLabel={i18n.translate('xpack.maps.esqlSource.narrowByGlobalTimeLabel', {
        defaultMessage: `Apply global time range to ES|QL statement`,
      })}
      fieldTypes={['date']}
      {...props}
    />
  );
}

interface NarrowByFieldProps {
  switchLabel: string;
  esql: string;
  field?: string;
  fields: string[];
  fieldTypes: string[];
  narrowByField: boolean;
  onFieldChange: (fieldName: string) => void;
  onNarrowByFieldChange: (narrowByField: boolean) => void;
}

function NarrowByField(props: NarrowByFieldProps) {
  const options = useMemo(() => {
    return props.fields.map((field) => {
      return {
        value: field,
        text: field,
      };
    });
  }, [props.fields]);

  const narrowBySwitch = (
    <EuiSwitch
      label={props.switchLabel}
      checked={props.narrowByField}
      onChange={(event: EuiSwitchEvent) => {
        props.onNarrowByFieldChange(event.target.checked);
      }}
      disabled={props.fields.length === 0}
      compressed
    />
  );

  return (
    <>
      <EuiFormRow>
        {props.fields.length === 0 ? (
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.maps.esqlSource.noFieldsMsg', {
              defaultMessage: `No {fieldTypes} fields are available from index pattern: {pattern}.`,
              values: {
                fieldTypes: props.fieldTypes
                  .map((type) => {
                    return `'${type}'`;
                  })
                  .join(', '),
                pattern: getIndexPatternFromESQLQuery(props.esql),
              },
            })}
          >
            {narrowBySwitch}
          </EuiToolTip>
        ) : (
          narrowBySwitch
        )}
      </EuiFormRow>

      {props.narrowByField && (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esql.narrowByFieldLabel', {
            defaultMessage: 'Filter by',
          })}
          display="columnCompressed"
        >
          <EuiSelect
            options={options}
            value={props.field}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              props.onFieldChange(e.target.value);
            }}
            compressed
          />
        </EuiFormRow>
      )}
    </>
  );
}
