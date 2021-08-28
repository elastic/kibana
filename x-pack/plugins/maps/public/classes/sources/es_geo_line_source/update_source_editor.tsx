/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import type { IFieldType } from '../../../../../../../src/plugins/data/common/index_patterns/fields/types';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { indexPatterns } from '../../../../../../../src/plugins/data/public';
import type { AggDescriptor } from '../../../../common/descriptor_types/source_descriptor_types';
import { MetricsEditor } from '../../../components/metrics_editor/metrics_editor';
import { getIndexPatternService } from '../../../kibana_services';
import type { OnSourceChangeArgs } from '../source';
import { GeoLineForm } from './geo_line_form';

interface Props {
  indexPatternId: string;
  splitField: string;
  sortField: string;
  metrics: AggDescriptor[];
  onChange: (...args: OnSourceChangeArgs[]) => void;
}

interface State {
  indexPattern: IndexPattern | null;
  fields: IFieldType[];
}

export class UpdateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexPattern: null,
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
      indexPattern,
      fields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
    });
  }

  _onMetricsChange = (metrics: AggDescriptor[]) => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  };

  _onSplitFieldChange = (fieldName: string) => {
    this.props.onChange({ propName: 'splitField', value: fieldName });
  };

  _onSortFieldChange = (fieldName: string) => {
    this.props.onChange({ propName: 'sortField', value: fieldName });
  };

  render() {
    if (!this.state.indexPattern) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.maps.source.esGeoLine.metricsLabel"
                defaultMessage="Track metrics"
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

        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.maps.source.esGeoLine.trackSettingsLabel"
                defaultMessage="Tracks"
              />
            </h6>
          </EuiTitle>
          <EuiSpacer size="m" />
          <GeoLineForm
            indexPattern={this.state.indexPattern}
            onSortFieldChange={this._onSortFieldChange}
            onSplitFieldChange={this._onSplitFieldChange}
            sortField={this.props.sortField}
            splitField={this.props.splitField}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
