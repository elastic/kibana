/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow
} from '@elastic/eui';
import { MultiFieldSelect } from './multi_field_select';
import { i18n } from '@kbn/i18n';

export class TooltipSelector extends React.Component {
  render() {
    return (
      <EuiFormRow
        label={
          i18n.translate('xpack.maps.source.esSearch.fieldsLabel', {
            defaultMessage: `Fields to display in tooltip`
          })
        }
      >
        <MultiFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esSearch.fieldsPlaceholder', {
            defaultMessage: `Select fields`
          })
          }
          value={this.props.tooltipProperties}
          onChange={this.props.onChange}
          fields={this.props.fields}
        />
      </EuiFormRow>
    );
  }
}
