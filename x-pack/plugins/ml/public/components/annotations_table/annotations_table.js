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
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';

import {
  RIGHT_ALIGNMENT,
} from '@elastic/eui/lib/services';

import { formatDate } from '@elastic/eui/lib/services/format';
import chrome from 'ui/chrome';

import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { ml } from 'plugins/ml/services/ml_api_service';
import { mlAnomaliesTableService } from '../anomalies_table/anomalies_table_service';
import { DEFAULT_QUERY_SIZE } from '../../../common/constants/search';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Table component for rendering the lists of annotations for an ML job.
 */
class AnnotationsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      isLoading: false
    };
  }

  getAnnotations() {
    const job = this.props.jobs[0];
    const dataCounts = job.data_counts;

    this.setState({
      isLoading: true
    });

    if (dataCounts.processed_record_count > 0) {
      // Load annotations for the selected job.
      ml.annotations.getAnnotations({
        jobIds: [job.job_id],
        earliestMs: dataCounts.earliest_record_timestamp,
        latestMs: dataCounts.latest_record_timestamp,
        maxAnnotations: DEFAULT_QUERY_SIZE
      }).then((resp) => {
        this.setState((prevState, props) => ({
          annotations: resp.annotations[props.jobs[0].job_id] || [],
          errorMessage: undefined,
          isLoading: false,
          jobId: props.jobs[0].job_id
        }));
      }).catch((resp) => {
        console.log('Error loading list of annoations for jobs list:', resp);
        this.setState({
          annotations: [],
          errorMessage: 'Error loading the list of annotations for this job',
          isLoading: false,
          jobId: undefined
        });
      });
    }
  }

  componentDidMount() {
    if (this.props.annotations === undefined) {
      this.getAnnotations();
    }
  }

  componentWillUpdate() {
    if (
      this.props.annotations === undefined &&
      this.state.isLoading === false &&
      this.state.jobId !== this.props.jobs[0].job_id
    ) {
      this.getAnnotations();
    }
  }

  openSingleMetricView(annotation) {
    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start to the end of the annotation,
    const dataCounts = this.props.jobs[0].data_counts;
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to = new Date(dataCounts.latest_record_timestamp).toISOString();

    const _g = rison.encode({
      ml: {
        jobIds: [this.props.jobs[0].job_id]
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
    addItemToRecentlyAccessed('timeseriesexplorer', this.props.jobs[0].job_id, url);
    window.open(`${chrome.getBasePath()}/app/ml#/timeseriesexplorer${url}`, '_self');
  }

  onMouseOverRow = (record) => {
    if (this.mouseOverRecord !== undefined) {
      if (this.mouseOverRecord.rowId !== record.rowId) {
        // Mouse is over a different row, fire mouseleave on the previous record.
        mlAnomaliesTableService.anomalyRecordMouseleave.changed(this.mouseOverRecord, 'annotation');

        // fire mouseenter on the new record.
        mlAnomaliesTableService.anomalyRecordMouseenter.changed(record, 'annotation');
      }
    } else {
      // Mouse is now over a row, fire mouseenter on the record.
      mlAnomaliesTableService.anomalyRecordMouseenter.changed(record, 'annotation');
    }

    this.mouseOverRecord = record;
  }

  onMouseLeaveRow = () => {
    if (this.mouseOverRecord !== undefined) {
      mlAnomaliesTableService.anomalyRecordMouseleave.changed(this.mouseOverRecord, 'annotation');
      this.mouseOverRecord = undefined;
    }
  };

  render() {
    const {
      isSingleMetricViewerLinkVisible = true,
      isNumberBadgeVisible = false
    } = this.props;

    if (this.props.annotations === undefined) {
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
    }

    const annotations = this.props.annotations || this.state.annotations;

    if (annotations.length === 0) {
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

    const columns = [
      {
        field: 'annotation',
        name: 'Annotation',
        sortable: true
      },
      {
        field: 'timestamp',
        name: 'From',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true,
        width: '180px'
      },
      {
        field: 'end_timestamp',
        name: 'To',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true,
        width: '180px'
      },
      {
        field: 'create_time',
        name: 'Creation date',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true,
        width: '180px'
      },
      {
        field: 'create_username',
        name: 'Created by',
        sortable: true,
        width: '180px'
      },
      {
        field: 'modified_time',
        name: 'Last modified date',
        dataType: 'date',
        render: (date) => formatDate(date, TIME_FORMAT),
        sortable: true,
        width: '180px'
      },
      {
        field: 'modified_username',
        name: 'Last modified by',
        sortable: true,
        width: '180px'
      },
    ];

    if (isNumberBadgeVisible) {
      columns.unshift({
        field: 'key',
        name: '#',
        width: '50px',
        render: (key) => {
          return (
            <EuiBadge color="default">
              {key}
            </EuiBadge>
          );
        }
      });
    }

    if (isSingleMetricViewerLinkVisible) {
      const openInSingleMetricViewerText = 'Open in Single Metric Viewer';
      columns.push({
        align: RIGHT_ALIGNMENT,
        width: '60px',
        name: 'View',
        render: (annotation) => (
          <EuiToolTip
            position="bottom"
            content={openInSingleMetricViewerText}
          >
            <EuiButtonIcon
              onClick={() => this.openSingleMetricView(annotation)}
              iconType="stats"
              aria-label={openInSingleMetricViewerText}
            />
          </EuiToolTip>
        )
      });
    }

    const getRowProps = (item) => {
      return {
        onMouseOver: () => this.onMouseOverRow(item),
        onMouseLeave: () => this.onMouseLeaveRow()
      };
    };

    return (
      <EuiInMemoryTable
        className="annotations-table"
        compressed={true}
        items={annotations}
        columns={columns}
        pagination={{
          pageSizeOptions: [5, 10, 25]
        }}
        sorting={true}
        rowProps={getRowProps}
      />
    );
  }
}
AnnotationsTable.propTypes = {
  annotations: PropTypes.array,
  jobs: PropTypes.array,
  isSingleMetricViewerLinkVisible: PropTypes.bool,
  isNumberBadgeVisible: PropTypes.bool
};

export { AnnotationsTable };
