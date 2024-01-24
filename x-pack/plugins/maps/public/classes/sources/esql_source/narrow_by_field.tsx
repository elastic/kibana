/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useMemo } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  switchLabel: string;
  noFieldsMessage: string;
  field?: string;
  fields: string[];
  narrowByField: boolean;
  onFieldChange: (fieldName: string) => void;
  onNarrowByFieldChange: (narrowByField: boolean) => void;
}

export function NarrowByField(props: Props) {
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
            content={props.noFieldsMessage}
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
            defaultMessage: 'Narrow by',
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
