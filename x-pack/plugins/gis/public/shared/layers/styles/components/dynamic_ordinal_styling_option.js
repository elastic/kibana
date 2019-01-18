/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import {
  EuiComboBox,
  EuiSpacer
} from '@elastic/eui';

import { ColorRampSelector } from './vector/color/color_ramp_selector';
import { SizeRangeSelector } from './vector/size/size_range_selector';

export const styleTypes = {
  COLOR_RAMP: 'color_ramp',
  SIZE_RANGE: 'size_range'
};

export function DynamicOrdinalStyleOption({ fields, selectedOptions, onChange, type }) {

  const onFieldChange = (selectedFields) => {
    const field = selectedFields.length > 0 ? selectedFields[0].value : null;
    onChange({ field });
  };

  const groupFieldsByOrigin = () => {
    const fieldsByOriginMap = new Map();
    fields
      .forEach(field => {
        if (fieldsByOriginMap.has(field.origin)) {
          const fieldsList = fieldsByOriginMap.get(field.origin);
          fieldsList.push(field);
          fieldsByOriginMap.set(field.origin, fieldsList);
        } else {
          fieldsByOriginMap.set(field.origin, [field]);
        }
      });

    const optionGroups = [];
    fieldsByOriginMap.forEach((fieldsList, fieldOrigin) => {
      optionGroups.push({
        label: fieldOrigin,
        options: fieldsList
          .map(field => {
            return { value: field, label: field.label };
          })
          .sort((a, b) => {
            return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
          })
      });
    });

    optionGroups.sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    return optionGroups;
  };

  const renderAdditionalOptions = () => {
    if (!_.has(selectedOptions, 'field')) {
      // TODO: Don't hide the component
      return;
    }

    const onAdditionalOptionsChange = (additionalOptions) => {
      onChange({ field: selectedOptions.field, ...additionalOptions });
    };

    switch (type) {
      case styleTypes.COLOR_RAMP:
        return (
          <Fragment>
            <ColorRampSelector
              onChange={onAdditionalOptionsChange}
              color={_.get(selectedOptions, 'color')}
            />
            <EuiSpacer size="s" />
          </Fragment>
        );
      case styleTypes.SIZE_RANGE:
        return (
          <SizeRangeSelector
            onChange={onAdditionalOptionsChange}
            minSize={_.get(selectedOptions, 'minSize')}
            maxSize={_.get(selectedOptions, 'maxSize')}
          />
        );
      default:
        throw new Error(`Unhandled type ${type}`);
    }
  };

  return (
    <Fragment>
      {renderAdditionalOptions()}

      <EuiComboBox
        selectedOptions={
          _.has(selectedOptions, 'field')
            ? [{ label: selectedOptions.field.label, value: selectedOptions.field }]
            : []
        }
        options={groupFieldsByOrigin()}
        onChange={onFieldChange}
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        fullWidth
        placeholder="Select a field"
      />
    </Fragment>
  );
}

DynamicOrdinalStyleOption.propTypes = {
  selectedOptions: PropTypes.object,
  fields: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(
    Object.keys(styleTypes).map(styleType => {
      return styleTypes[styleType];
    })
  ).isRequired,
};
