/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';

import { EuiSelect } from '@elastic/eui';

import { fieldTypeSelectOptions } from '../constants/field_types';

import { RECENTY_ADDED } from './constants';

interface ISchemaExistingFieldProps {
  disabled?: boolean;
  fieldName: string;
  fieldType?: string;
  unconfirmed?: boolean;
  hideName?: boolean;
  updateExistingFieldType?(fieldName: string, fieldType: string): void;
}

export const SchemaExistingField: React.FC<ISchemaExistingFieldProps> = ({
  disabled,
  fieldName,
  fieldType,
  unconfirmed,
  hideName,
  updateExistingFieldType,
}) => {
  const fieldCssClass = classNames('c-stui-engine-schema-field', {
    'c-stui-engine-schema-field--recently-added': unconfirmed,
  });

  return (
    <div className={fieldCssClass} id={`field_${fieldName}`}>
      <div className="c-stui-engine-schema-field__name">{!hideName ? fieldName : ''}</div>
      {unconfirmed && <div className="c-stui-engine-schema-field__status">{RECENTY_ADDED}</div>}
      {fieldType && updateExistingFieldType && (
        <div className="o-stui-select-container o-stui-select-container--align-right">
          <EuiSelect
            name={fieldName}
            required
            value={fieldType}
            options={fieldTypeSelectOptions}
            disabled={disabled}
            onChange={(e) => updateExistingFieldType(fieldName, e.target.value)}
            data-test-subj="SchemaSelect"
          />
        </div>
      )}
    </div>
  );
};
