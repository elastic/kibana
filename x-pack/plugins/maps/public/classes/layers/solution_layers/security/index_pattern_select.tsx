/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from 'src/plugins/data/public';
import { getSecurityIndexPatterns } from './security_index_pattern_utils';

interface Props {
  value: string;
  onChange: (indexPattern: IndexPattern | undefined) => void;
}

interface State {
  hasLoaded: boolean;
  indexPatterns: IndexPattern[];
}

export class IndexPatternSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoaded: false,
    indexPatterns: [],
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadIndexPatterns();
  }

  async _loadIndexPatterns() {
    const indexPatterns = await getSecurityIndexPatterns();
    if (!this._isMounted) {
      return;
    }

    this.setState({
      hasLoaded: true,
      indexPatterns,
    });
  }

  _onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const targetIndexPattern = this.state.indexPatterns.find((indexPattern: IndexPattern) => {
      return event.target.value === indexPattern.id;
    });
    this.props.onChange(targetIndexPattern);
  };

  render() {
    if (!this.state.hasLoaded) {
      return null;
    }

    const options = this.state.indexPatterns.map((indexPattern: IndexPattern) => {
      return {
        value: indexPattern.id,
        text: indexPattern.title,
      };
    });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.security.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        })}
      >
        <EuiSelect
          options={[{ value: '', text: '' }, ...options]}
          value={this.props.value ? this.props.value : ''}
          onChange={this._onChange}
        />
      </EuiFormRow>
    );
  }
}
