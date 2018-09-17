/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { getSavedVisualizations } from '../../../public/lib/kibana_service';

class SavedVisSelect extends React.PureComponent {
  static propTypes = {
    onValueChange: PropTypes.func.isRequired,
    argValue: PropTypes.string.isRequired,
    argId: PropTypes.string.isRequired,
  };

  state = {
    isLoading: true,
    visualizations: [],
  };

  componentWillMount = async () => {
    const { visualizations } = await getSavedVisualizations();
    const visOptions = [{ text: 'Select a Saved Vis', disabled: true }].concat(
      visualizations.map(vis => ({ text: vis.title, value: vis.id }))
    );

    this.setState({
      isLoading: false,
      visualizations: visOptions,
    });
  };

  handleChange = ev => {
    this.props.onValueChange(ev.target.value);
  };

  render() {
    const { argValue, argId } = this.props;

    if (this.state.isLoading) return <div>Loading visualizations...</div>;

    return (
      <EuiSelect
        id={argId}
        defaultValue={argValue}
        hasNoInitialSelection={!argValue}
        options={this.state.visualizations}
        onChange={this.handleChange}
      />
    );
  }
}

export const visualizeSelect = () => ({
  name: 'visualize_select',
  displayName: 'Visualize Select',
  help: 'Select from multiple options in a drop down',
  simpleTemplate: templateFromReactComponent(SavedVisSelect),
});
