/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import { getDataViewNotFoundMessage } from '../../../../common/i18n_getters';
import { MetricsEditor } from '../../../components/metrics_editor';
import { getIndexPatternService } from '../../../kibana_services';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { indexPatterns } from '@kbn/data-plugin/public';

export class UpdateSourceEditor extends Component {
  state = {
    fields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFields() {
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: getDataViewNotFoundMessage(this.props.indexPatternId),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      fields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
    });
  }

  _onMetricsChange = (metrics) => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  };

  render() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.maps.source.pewPew.metricsLabel"
                defaultMessage="Metrics"
              />
            </h6>
          </EuiTitle>
          <EuiSpacer size="m" />
          <MetricsEditor
            allowMultipleMetrics={true}
            fields={this.state.fields}
            metrics={this.props.metrics}
            onChange={this._onMetricsChange}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
