/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSecurityIndexPatterns, IndexPatternMeta } from './security_index_pattern_utils';

interface Props {
  value: string;
  onChange: (indexPatternMeta: IndexPatternMeta | null) => void;
}

interface State {
  hasLoaded: boolean;
  options: EuiSelectOption[];
}

export class IndexPatternSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoaded: false,
    options: [],
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOptions();
  }

  async _loadOptions() {
    const indexPatterns = await getSecurityIndexPatterns();
    if (!this._isMounted) {
      return;
    }

    this.setState({
      hasLoaded: true,
      options: [
        { value: '', text: '' },
        ...indexPatterns.map(({ id, title }: IndexPatternMeta) => {
          return {
            value: id,
            text: title,
          };
        }),
      ],
    });
  }

  _onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const targetOption = this.state.options.find(({ value, text }: EuiSelectOption) => {
      return event.target.value === value;
    });

    if (event.target.value === '' || !targetOption) {
      this.props.onChange(null);
      return;
    }

    this.props.onChange({
      // @ts-expect-error - avoid wrong "Property does not exist on type 'never'." compile error
      id: targetOption.value,
      // @ts-expect-error - avoid wrong "Property does not exist on type 'never'." compile error
      title: targetOption.text,
    });
  };

  render() {
    if (!this.state.hasLoaded) {
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.security.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        })}
      >
        <EuiSelect
          options={this.state.options}
          value={this.props.value ? this.props.value : ''}
          onChange={this._onChange}
        />
      </EuiFormRow>
    );
  }
}
