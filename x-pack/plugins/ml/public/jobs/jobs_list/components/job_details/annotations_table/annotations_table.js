/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import rison from 'rison-node';

import React, {
  Component
} from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner
} from '@elastic/eui';
import { formatDate } from '@elastic/eui/lib/services/format';
import chrome from 'ui/chrome';

import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { ml } from 'plugins/ml/services/ml_api_service';


const MAX_ANNOTATIONS = 500;
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Table component for rendering the lists of annotations for an ML job.
 */
class AnnotationsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: props.job.data_counts.processed_record_count !== 0,
      forecasts: []
    };
  }

  getAnnotations() {
    const dataCounts = this.props.job.data_counts;
    if (dataCounts.processed_record_count > 0) {
      // Load annotations for the selected job.
      ml.annotations.getAnnotations({
        jobIds: [this.props.job.job_id],
        earliestMs: dataCounts.earliest_record_timestamp,
        latestMs: dataCounts.latest_record_timestamp,
        maxAnnotations: MAX_ANNOTATIONS
      }).then((resp) => {
        this.setState((prevState, props) => ({
          isLoading: false,
          annotations: resp.annotations[props.job.job_id] || []
        }));
      }).catch((resp) => {
        console.log('Error loading list of annoations for jobs list:', resp);
        this.setState({
          isLoading: false,
          errorMessage: 'Error loading the list of annotations for this job',
          annotations: []
        });
      });
    }
  }

  componentDidMount() {
    this.getAnnotations();
  }

  componentWillUpdate() {
    this.getAnnotations();
  }

  openSingleMetricView(annotation) {
    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start of the job data to the end of the forecast,
    const dataCounts = this.props.job.data_counts;
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to = new Date(dataCounts.latest_record_timestamp).toISOString();

    const _g = rison.encode({
      ml: {
        jobIds: [this.props.job.job_id]
      },
      refreshInterval: {
        display: 'Off',
        pause: false,
        value: 0
      },
      time: {
        from,
        to,
        mode: 'absolute'
      }
    });

    const appState = {
      filters: [],
      query: {
        query_string: {
          analyze_wildcard: true,
          query: '*'
        }
      }
    };

    if (annotation !== undefined) {
      appState.mlTimeSeriesExplorer = {
        zoom: {
          from: new Date(annotation.timestamp).toISOString(),
          to: new Date(annotation.end_timestamp).toISOString()
        }
      };
    }

    const _a = rison.encode(appState);

    const url = `?_g=${_g}&_a=${_a}`;
    addItemToRecentlyAccessed('timeseriesexplorer', this.props.job.job_id, url);
    window.open(`${chrome.getBasePath()}/app/ml#/timeseriesexplorer${url}`, '_self');
  }

  render() {
    if (this.state.isLoading === true) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}><EuiLoadingSpinner size="l"/></EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (this.state.errorMessage !== undefined) {
      return (
        <EuiCallOut
          title={this.state.errorMessage}
          color="danger"
          iconType="cross"
        />
      );
    }

    const annotations = this.state.annotations;

    if (annotations.length === 0 && this.props.renderEmptyMessage) {
      return (
        <EuiCallOut
          title="No annotations created for this job"
          iconType="iInCircle"
        >
          <p>
            To create an annotation,
            open the <EuiLink onClick={() => this.openSingleMetricView()}>Single Metric Viewer</EuiLink>
          </p>
        </EuiCallOut>
      );
    }

    if (annotations.length === 0 && !this.props.renderEmptyMessage) {
      return null;
    }

    const columns = [
      {
        field: 'annotation',
        name: 'Annotation text',
        sortable: true
      },
      {
        field: 'timestamp',
        name: 'From',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        field: 'end_timestamp',
        name: 'To',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        name: 'View',
        render: (annotation) => (
          <EuiButton
            onClick={() => this.openSingleMetricView(annotation)}
            className="view-annotations-btn"
          >
            <i aria-hidden="true" className="fa fa-line-chart"/>
          </EuiButton>
        )
      }
    ];

    return (
      <EuiInMemoryTable
        className="annotations-table"
        items={annotations}
        columns={columns}
        pagination={{
          pageSizeOptions: [5, 10, 25]
        }}
        sorting={true}
      />
    );
  }
}
AnnotationsTable.propTypes = {
  job: PropTypes.object.isRequired,
  renderEmptyMessage: PropTypes.bool
};

export { AnnotationsTable };
