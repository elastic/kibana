/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiComboBox,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from '../../vector_constants';
import { SYMBOLS, buildSrcUrl } from '../../symbol_utils';

const SYMBOLIZE_AS_OPTIONS = [
  {
    value: SYMBOLIZE_AS_CIRCLE,
    text: i18n.translate('xpack.maps.vector.symbolAs.circleLabel', {
      defaultMessage: 'circle'
    })
  },
  {
    value: SYMBOLIZE_AS_ICON,
    text: i18n.translate('xpack.maps.vector.symbolAs.IconLabel', {
      defaultMessage: 'icon'
    })
  },
];

const SYMBOL_OPTIONS = Object.keys(SYMBOLS).map(symbolId => {
  return ({
    value: symbolId,
    label: symbolId,
  });
});

export function VectorStyleSymbolEditor({ styleOptions, handlePropertyChange }) {
  const renderSymbolizeAsSelect = () => {
    const selectedOption = SYMBOLIZE_AS_OPTIONS.find(({ value }) => {
      return value === styleOptions.symbolizeAs;
    });

    const onSymbolizeAsChange = e => {
      const styleDescriptor = {
        options: {
          ...styleOptions,
          symbolizeAs: e.target.value
        }
      };
      handlePropertyChange('symbol', styleDescriptor);
    };

    return (
      <EuiSelect
        options={SYMBOLIZE_AS_OPTIONS}
        value={selectedOption ? selectedOption.value : undefined}
        onChange={onSymbolizeAsChange}
      />
    );
  };

  const renderSymbolSelect = () => {
    const selectedOption = SYMBOL_OPTIONS.find(({ value }) => {
      return value === styleOptions.symbolId;
    });

    const onSymbolChange = selectedOptions => {
      if (!selectedOptions || selectedOptions.length === 0) {
        return;
      }

      const styleDescriptor = {
        options: {
          ...styleOptions,
          symbolId: selectedOptions[0].value
        }
      };
      handlePropertyChange('symbol', styleDescriptor);
    };

    const renderOption = ({ value, label }) => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false} style={{ width: '15px' }}>
            <img src={buildSrcUrl(SYMBOLS[value])} alt={label} />
          </EuiFlexItem>
          <EuiFlexItem>
            {label}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return (
      <EuiComboBox
        options={SYMBOL_OPTIONS}
        onChange={onSymbolChange}
        selectedOptions={selectedOption ? [selectedOption] : undefined}
        singleSelection={true}
        isClearable={false}
        renderOption={renderOption}
      />
    );
  };

  const renderFormRowContent = () => {
    if (styleOptions.symbolizeAs === SYMBOLIZE_AS_CIRCLE) {
      return renderSymbolizeAsSelect();
    }

    return (
      <Fragment>
        {renderSymbolizeAsSelect()}
        <EuiSpacer size="s" />
        {renderSymbolSelect()}
      </Fragment>
    );
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.vector.symbolLabel', {
        defaultMessage: 'Symbol'
      })}
    >
      {renderFormRowContent()}
    </EuiFormRow>
  );
}
