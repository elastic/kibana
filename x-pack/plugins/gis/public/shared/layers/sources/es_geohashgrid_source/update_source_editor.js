/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';

import { RENDER_AS } from './render_as';
import { MetricsEditor } from '../../../components/metrics_editor';
import { indexPatternService } from '../../../../kibana_services';

export class UpdateSourceEditor extends Component {

  state = {
    fields: null,
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: `Unable to find Index pattern ${this.props.indexPatternId}`
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ fields: indexPattern.fields });
  }

  onMetricsChange = (metrics) => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  }

  renderMetricsEditor() {
    if (this.props.renderAs === RENDER_AS.HEATMAP) {
      return null;
    }

    return (
      <MetricsEditor
        fields={this.state.fields}
        metrics={this.props.metrics}
        onChange={this.onMetricsChange}
      />
    );
  }

  render() {
    return (
      <Fragment>
        {this.renderMetricsEditor()}
      </Fragment>
    );
  }
}
