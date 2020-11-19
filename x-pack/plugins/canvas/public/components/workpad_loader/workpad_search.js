/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFieldSearch } from '@elastic/eui';
import { debounce } from 'lodash';
import { ComponentStrings } from '../../../i18n';

const { WorkpadSearch: strings } = ComponentStrings;
export class WorkpadSearch extends React.PureComponent {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    initialText: PropTypes.string,
  };

  state = {
    searchText: this.props.initialText || '',
  };

  triggerChange = debounce(this.props.onChange, 150);

  setSearchText = (ev) => {
    const text = ev.target.value;
    this.setState({ searchText: text });
    this.triggerChange(text);
  };

  render() {
    return (
      <EuiFieldSearch
        placeholder={strings.getWorkpadSearchPlaceholder()}
        value={this.state.searchText}
        onChange={this.setSearchText}
        fullWidth
        incremental
      />
    );
  }
}
