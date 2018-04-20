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
import { formatDate, formatNumber } from '@elastic/eui/lib/services/format';
import chrome from 'ui/chrome';

import { FORECAST_REQUEST_STATE } from 'plugins/ml/../common/constants/states';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';

const MAX_FORECASTS = 500;
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Table component for rendering the lists of forecasts run on an ML job.
 */
class ForecastsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: props.job.data_counts.processed_record_count !== 0,
      forecasts: []
    };
  }

  componentDidMount() {
    const dataCounts = this.props.job.data_counts;
    if (dataCounts.processed_record_count > 0) {
      // Get the list of all the forecasts with results at or later than the specified 'from' time.
      this.props.mlForecastService.getForecastsSummary(
        this.props.job,
        null,
        dataCounts.earliest_record_timestamp,
        MAX_FORECASTS)
        .then((resp) => {
          this.setState({
            isLoading: false,
            forecasts: resp.forecasts
          });
        })
        .catch((resp) => {
          console.log('Error loading list of forecasts for jobs list:', resp);
          this.setState({
            isLoading: false,
            errorMessage: 'Error loading the list of forecasts run on this job',
            forecasts: []
          });
        });
    }
  }

  openSingleMetricView(forecast) {
    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start of the job data to the end of the forecast,
    const dataCounts = this.props.job.data_counts;
    const jobEarliest = dataCounts.earliest_record_timestamp;
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to = forecast !== undefined ? new Date(forecast.forecast_end_timestamp).toISOString() :
      new Date(dataCounts.latest_record_timestamp).toISOString();

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

    if (forecast !== undefined) {
      // Set the zoom to show duration before the forecast equal to the length of the forecast.
      const forecastDurationMs = forecast.forecast_end_timestamp - forecast.forecast_start_timestamp;
      const zoomFrom = Math.max(forecast.forecast_start_timestamp - forecastDurationMs, jobEarliest);

      appState.mlTimeSeriesExplorer = {
        forecastId: forecast.forecast_id,
        zoom: {
          from: new Date(zoomFrom).toISOString(),
          to: new Date(forecast.forecast_end_timestamp).toISOString()
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

    const forecasts = this.state.forecasts;

    if (forecasts.length === 0) {
      return (
        <EuiCallOut
          title="No forecasts have been run for this job"
          iconType="iInCircle"
        >
          <p>
            To run a forecast,
            open the <EuiLink onClick={() => this.openSingleMetricView()}>Single Metric Viewer</EuiLink>.
          </p>
        </EuiCallOut>
      );
    }

    const columns = [
      {
        field: 'forecast_create_timestamp',
        name: 'Created',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        field: 'forecast_start_timestamp',
        name: 'From',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        field: 'forecast_end_timestamp',
        name: 'To',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        field: 'forecast_status',
        name: 'Status',
        sortable: true
      },
      {
        field: 'forecast_memory_bytes',
        name: 'Memory size',
        render: (bytes) => formatNumber(bytes, '0b'),
        sortable: true
      },
      {
        field: 'processing_time_ms',
        name: 'Processing time',
        render: (ms) => `${ms} ms`,
        sortable: true
      },
      {
        field: 'forecast_expiry_timestamp',
        name: 'Expires',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true
      },
      {
        field: 'forecast_messages',
        name: 'Messages',
        sortable: false,
        render: (messages) => {
          return (
            <div>
              {messages.map((message, index) => {
                return <p key={index}>{message}</p>;
              })}
            </div>
          );
        }
      },
      {
        name: 'View',
        render: (forecast) => (
          <EuiButton
            onClick={() => this.openSingleMetricView(forecast)}
            className="view-forecast-btn"
            isDisabled={forecast.forecast_status !== FORECAST_REQUEST_STATE.FINISHED}
          >
            <i aria-hidden="true" className="fa fa-line-chart"/>
          </EuiButton>
        )
      }
    ];

    return (
      <EuiInMemoryTable
        items={forecasts}
        columns={columns}
        pagination={{
          pageSizeOptions: [5, 10, 25]
        }}
        sorting={true}
      />
    );
  }
}
ForecastsTable.propTypes = {
  job: PropTypes.object.isRequired,
  mlForecastService: PropTypes.object.isRequired
};

export { ForecastsTable };
