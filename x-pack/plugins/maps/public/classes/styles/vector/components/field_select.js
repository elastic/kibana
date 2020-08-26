/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiComboBox, EuiHighlight, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '../../../../../../../../src/plugins/kibana_react/public';

function renderOption(option, searchValue, contentClassName) {
  return (
    <EuiFlexGroup className={contentClassName} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={null}>
        <FieldIcon type={option.value.type} fill="none" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function groupFieldsByOrigin(fields) {
  const fieldsByOriginMap = new Map();
  fields.forEach((field) => {
    if (fieldsByOriginMap.has(field.origin)) {
      const fieldsList = fieldsByOriginMap.get(field.origin);
      fieldsList.push(field);
      fieldsByOriginMap.set(field.origin, fieldsList);
    } else {
      fieldsByOriginMap.set(field.origin, [field]);
    }
  });

  function fieldsListToOptions(fieldsList) {
    return fieldsList
      .map((field) => {
        return { value: field, label: field.label };
      })
      .sort((a, b) => {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });
  }

  if (fieldsByOriginMap.size === 1) {
    // do not show origin group if all fields are from same origin
    const onlyOriginKey = fieldsByOriginMap.keys().next().value;
    const fieldsList = fieldsByOriginMap.get(onlyOriginKey);
    return fieldsListToOptions(fieldsList);
  }

  const optionGroups = [];
  fieldsByOriginMap.forEach((fieldsList, fieldOrigin) => {
    optionGroups.push({
      label: i18n.translate('xpack.maps.style.fieldSelect.OriginLabel', {
        defaultMessage: 'Fields from {fieldOrigin}',
        values: { fieldOrigin },
      }),
      options: fieldsListToOptions(fieldsList),
    });
  });

  optionGroups.sort((a, b) => {
    return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
  });

  return optionGroups;
}

export function FieldSelect({ fields, selectedFieldName, onChange, styleName, ...rest }) {
  const onFieldChange = (selectedFields) => {
    onChange({
      field: selectedFields.length > 0 ? selectedFields[0].value : null,
    });
  };

  let selectedOption;
  if (selectedFieldName) {
    const field = fields.find((field) => {
      return field.name === selectedFieldName;
    });
    //Do not spread in all the other unused values (e.g. type, supportsAutoDomain etc...)
    if (field) {
      selectedOption = {
        value: field.value,
        label: field.label,
      };
    }
  }

  return (
    <EuiComboBox
      selectedOptions={selectedOption ? [selectedOption] : []}
      options={groupFieldsByOrigin(fields)}
      onChange={onFieldChange}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      fullWidth
      placeholder={i18n.translate('xpack.maps.styles.vector.selectFieldPlaceholder', {
        defaultMessage: 'Select a field',
      })}
      renderOption={renderOption}
      data-test-subj={`styleFieldSelect_${styleName}`}
      {...rest}
    />
  );
}

export const fieldShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  origin: PropTypes.oneOf(Object.values(FIELD_ORIGIN)).isRequired,
  type: PropTypes.string.isRequired,
});

FieldSelect.propTypes = {
  selectedFieldName: PropTypes.string,
  fields: PropTypes.arrayOf(fieldShape).isRequired,
  onChange: PropTypes.func.isRequired,
};
