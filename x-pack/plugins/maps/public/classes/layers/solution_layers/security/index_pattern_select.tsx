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
  value: string | null;
  onChange: (indexPatternId: string) => void;
}

interface State {
  options: EuiSelectOption[];
  hasLoadedOptions: boolean;
}

export class IndexPatternSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoadedOptions: false,
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
    const securityIndexPatterns = await getSecurityIndexPatterns();
    if (!this._isMounted) {
      return;
    }

    const options = securityIndexPatterns.map(({ id, title }: IndexPatternMeta) => {
      return {
        value: id,
        text: title,
      };
    });

    this.setState({
      hasLoadedOptions: true,
      options: [{ value: '', text: '' }, ...options],
    });
  }

  _onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    this.props.onChange(event.target.value);
  };

  render() {
    if (!this.state.hasLoadedOptions) {
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
