/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import type { DataViewField } from '@kbn/data-plugin/common';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { indexPatterns } from '@kbn/data-plugin/public';
import { MetricsEditor } from '../../../components/metrics_editor';
import { getIndexPatternService } from '../../../kibana_services';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';

interface Props {
  bucketsName: string;
  indexPatternId: string;
  metrics: AggDescriptor[];
  onChange: (...args: OnSourceChangeArgs[]) => void;
}

interface State {
  fields: DataViewField[];
}

export class UpdateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    fields: [],
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
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      fields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
    });
  }

  _onMetricsChange = (metrics: AggDescriptor[]) => {
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
            bucketsName={this.props.bucketsName}
            isJoin={false}
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
