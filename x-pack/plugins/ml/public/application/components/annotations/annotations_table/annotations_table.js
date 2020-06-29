/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Table for displaying annotations. This is mostly a copy of the forecasts table.
 * This version supports both fetching the annotations by itself (used in the jobs list) and
 * getting the annotations via props (used in Anomaly Explorer and Single Series Viewer).
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import rison from 'rison-node';

import React, { Component, Fragment } from 'react';

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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

import { formatDate } from '@elastic/eui/lib/services/format';

import { addItemToRecentlyAccessed } from '../../../util/recently_accessed';
import { ml } from '../../../services/ml_api_service';
import { mlJobService } from '../../../services/job_service';
import { mlTableService } from '../../../services/table_service';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../../../common/constants/search';
import {
  getLatestDataOrBucketTimestamp,
  isTimeSeriesViewJob,
} from '../../../../../common/util/job_utils';
import { TIME_FORMAT } from '../../../../../common/constants/time_format';

import {
  annotation$,
  annotationsRefresh$,
  annotationsRefreshed,
} from '../../../services/annotations_service';

/**
 * Table component for rendering the lists of annotations for an ML job.
 */
export class AnnotationsTable extends Component {
  static propTypes = {
    annotations: PropTypes.array,
    jobs: PropTypes.array,
    isSingleMetricViewerLinkVisible: PropTypes.bool,
    isNumberBadgeVisible: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      isLoading: false,
      jobId:
        Array.isArray(this.props.jobs) &&
        this.props.jobs.length > 0 &&
        this.props.jobs[0] !== undefined
          ? this.props.jobs[0].job_id
          : undefined,
      filters: false,
      filterOptions: [],
    };
    this.sorting = {
      sort: { field: 'timestamp', direction: 'asc' },
    };
  }

  getAnnotations() {
    const job = this.props.jobs[0];
    const dataCounts = job.data_counts;

    this.setState({
      isLoading: true,
    });

    if (dataCounts.processed_record_count > 0) {
      // Load annotations for the selected job.
      ml.annotations
        .getAnnotations({
          jobIds: [job.job_id],
          earliestMs: null,
          latestMs: null,
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        })
        .toPromise()
        .then((resp) => {
          this.setState((prevState, props) => ({
            annotations: resp.annotations[props.jobs[0].job_id] || [],
            errorMessage: undefined,
            isLoading: false,
            jobId: props.jobs[0].job_id,
          }));
        })
        .catch((resp) => {
          console.log('Error loading list of annotations for jobs list:', resp);
          this.setState({
            annotations: [],
            errorMessage: 'Error loading the list of annotations for this job',
            isLoading: false,
            jobId: undefined,
          });
        });
    }
  }

  getUniqueTerms() {
    const { jobIds } = this.props;

    this.setState({
      isLoading: true,
    });

    if (jobIds) {
      // Load annotations for the selected job.
      ml.annotations
        .getUniqueAnnotationTerms({
          jobIds: jobIds,
          earliestMs: null,
          latestMs: null,
          fields: [
            {
              field: 'event',
              missing: 'user',
            },
          ],
        })
        .toPromise()
        .then((resp) => {
          const buckets = resp.event.buckets;
          const foundUser = buckets.findIndex((d) => d.key === 'user') > -1;
          this.setState({
            filterOptions: foundUser ? buckets : [{ key: 'user', doc_count: 0 }, ...buckets],
          });
        })
        .catch((resp) => {
          console.log('Error loading list of unique annotation terms for jobs list:', resp);
          this.setState({
            annotations: [],
            errorMessage: 'Error loading the list of annotation terms for this job',
            isLoading: false,
            jobId: undefined,
          });
        });
    }
  }

  getJob(jobId) {
    // check if the job was supplied via props and matches the supplied jobId
    if (Array.isArray(this.props.jobs) && this.props.jobs.length > 0) {
      const job = this.props.jobs[0];
      if (jobId === undefined || job.job_id === jobId) {
        return job;
      }
    }

    return mlJobService.getJob(jobId);
  }

  annotationsRefreshSubscription = null;

  componentDidMount() {
    if (
      this.props.annotations === undefined &&
      Array.isArray(this.props.jobs) &&
      this.props.jobs.length > 0
    ) {
      this.annotationsRefreshSubscription = annotationsRefresh$.subscribe(() => {
        this.getAnnotations();
        this.getUniqueTerms();
      });
      annotationsRefreshed();
    }

    if (this.props.jobIds) {
      this.getUniqueTerms();
    }
  }

  previousJobId = undefined;
  componentDidUpdate(prevProps) {
    if (
      Array.isArray(this.props.jobs) &&
      this.props.jobs.length > 0 &&
      this.previousJobId !== this.props.jobs[0].job_id &&
      this.props.annotations === undefined &&
      this.state.isLoading === false &&
      this.state.jobId !== this.props.jobs[0].job_id
    ) {
      this.getUniqueTerms();
      annotationsRefreshed();
      this.previousJobId = this.props.jobs[0].job_id;
    }

    if (prevProps.annotations !== this.props.annotations && this.props.jobIds) {
      this.getUniqueTerms();
    }
  }

  componentWillUnmount() {
    if (this.annotationsRefreshSubscription !== null) {
      this.annotationsRefreshSubscription.unsubscribe();
    }
  }

  openSingleMetricView = (annotation = {}) => {
    // Creates the link to the Single Metric Viewer.
    // Set the total time range from the start to the end of the annotation.
    const job = this.getJob(annotation.job_id);
    const dataCounts = job.data_counts;
    const resultLatest = getLatestDataOrBucketTimestamp(
      dataCounts.latest_record_timestamp,
      dataCounts.latest_bucket_timestamp
    );
    const from = new Date(dataCounts.earliest_record_timestamp).toISOString();
    const to = new Date(resultLatest).toISOString();

    const globalSettings = {
      ml: {
        jobIds: [job.job_id],
      },
      refreshInterval: {
        display: 'Off',
        pause: false,
        value: 0,
      },
      time: {
        from,
        to,
        mode: 'absolute',
      },
    };

    const appState = {
      query: {
        query_string: {
          analyze_wildcard: true,
          query: '*',
        },
      },
    };

    if (annotation.timestamp !== undefined && annotation.end_timestamp !== undefined) {
      appState.mlTimeSeriesExplorer = {
        zoom: {
          from: new Date(annotation.timestamp).toISOString(),
          to: new Date(annotation.end_timestamp).toISOString(),
        },
      };

      if (annotation.timestamp < dataCounts.earliest_record_timestamp) {
        globalSettings.time.from = new Date(annotation.timestamp).toISOString();
      }

      if (annotation.end_timestamp > dataCounts.latest_record_timestamp) {
        globalSettings.time.to = new Date(annotation.end_timestamp).toISOString();
      }
    }

    const _g = rison.encode(globalSettings);
    const _a = rison.encode(appState);

    const url = `?_g=${_g}&_a=${_a}`;
    addItemToRecentlyAccessed('timeseriesexplorer', job.job_id, url);
    window.open(`#/timeseriesexplorer${url}`, '_self');
  };

  onMouseOverRow = (record) => {
    if (this.mouseOverRecord !== undefined) {
      if (this.mouseOverRecord.rowId !== record.rowId) {
        // Mouse is over a different row, fire mouseleave on the previous record.
        mlTableService.rowMouseleave$.next({ record: this.mouseOverRecord, type: 'annotation' });

        // fire mouseenter on the new record.
        mlTableService.rowMouseenter$.next({ record, type: 'annotation' });
      }
    } else {
      // Mouse is now over a row, fire mouseenter on the record.
      mlTableService.rowMouseenter$.next({ record, type: 'annotation' });
    }

    this.mouseOverRecord = record;
  };

  onMouseLeaveRow = () => {
    if (this.mouseOverRecord !== undefined) {
      mlTableService.rowMouseleave$.next({ record: this.mouseOverRecord, type: 'annotation' });
      this.mouseOverRecord = undefined;
    }
  };

  render() {
    const { isSingleMetricViewerLinkVisible = true, isNumberBadgeVisible = false } = this.props;

    if (this.props.annotations === undefined) {
      if (this.state.isLoading === true) {
        return (
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      if (this.state.errorMessage !== undefined) {
        return <EuiCallOut title={this.state.errorMessage} color="danger" iconType="cross" />;
      }
    }

    const annotations = this.props.annotations || this.state.annotations;

    if (annotations.length === 0) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.annotationsTable.annotationsNotCreatedTitle"
              defaultMessage="No annotations created for this job"
            />
          }
          iconType="iInCircle"
          role="alert"
        >
          {this.state.jobId && isTimeSeriesViewJob(this.getJob(this.state.jobId)) && (
            <p>
              <FormattedMessage
                id="xpack.ml.annotationsTable.howToCreateAnnotationDescription"
                defaultMessage="To create an annotation, open the {linkToSingleMetricView}"
                values={{
                  linkToSingleMetricView: (
                    <EuiLink onClick={() => this.openSingleMetricView()}>
                      <FormattedMessage
                        id="xpack.ml.annotationsTable.howToCreateAnnotationDescription.singleMetricViewerLinkText"
                        defaultMessage="Single Metric Viewer"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          )}
        </EuiCallOut>
      );
    }

    function renderDate(date) {
      return formatDate(date, TIME_FORMAT);
    }

    const columns = [
      {
        field: 'annotation',
        name: i18n.translate('xpack.ml.annotationsTable.annotationColumnName', {
          defaultMessage: 'Annotation',
        }),
        sortable: true,
        width: '50%',
        scope: 'row',
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.ml.annotationsTable.fromColumnName', {
          defaultMessage: 'From',
        }),
        dataType: 'date',
        render: renderDate,
        sortable: true,
      },
      {
        field: 'end_timestamp',
        name: i18n.translate('xpack.ml.annotationsTable.toColumnName', {
          defaultMessage: 'To',
        }),
        dataType: 'date',
        render: renderDate,
        sortable: true,
      },
      {
        field: 'modified_time',
        name: i18n.translate('xpack.ml.annotationsTable.lastModifiedDateColumnName', {
          defaultMessage: 'Last modified date',
        }),
        dataType: 'date',
        render: renderDate,
        sortable: true,
      },
      {
        field: 'modified_username',
        name: i18n.translate('xpack.ml.annotationsTable.lastModifiedByColumnName', {
          defaultMessage: 'Last modified by',
        }),
        sortable: true,
      },
      {
        field: 'event',
        name: i18n.translate('xpack.ml.annotationsTable.eventColumnName', {
          defaultMessage: 'Event',
        }),
        sortable: true,
      },
    ];

    const jobIds = _.uniq(annotations.map((a) => a.job_id));
    if (jobIds.length > 1) {
      columns.unshift({
        field: 'job_id',
        name: i18n.translate('xpack.ml.annotationsTable.jobIdColumnName', {
          defaultMessage: 'job ID',
        }),
        sortable: true,
      });
    }

    if (isNumberBadgeVisible) {
      columns.unshift({
        field: 'key',
        name: i18n.translate('xpack.ml.annotationsTable.labelColumnName', {
          defaultMessage: 'Label',
        }),
        sortable: true,
        width: '60px',
        render: (key) => {
          return <EuiBadge color="default">{key}</EuiBadge>;
        },
      });
    }

    const actions = [];

    actions.push({
      render: (annotation) => {
        const editAnnotationsTooltipText = (
          <FormattedMessage
            id="xpack.ml.annotationsTable.editAnnotationsTooltip"
            defaultMessage="Edit annotation"
          />
        );
        const editAnnotationsTooltipAriaLabelText = (
          <FormattedMessage
            id="xpack.ml.annotationsTable.editAnnotationsTooltipAriaLabel"
            defaultMessage="Edit annotation"
          />
        );
        return (
          <EuiToolTip position="bottom" content={editAnnotationsTooltipText}>
            <EuiButtonIcon
              onClick={() => annotation$.next(annotation)}
              iconType="pencil"
              aria-label={editAnnotationsTooltipAriaLabelText}
            />
          </EuiToolTip>
        );
      },
    });

    if (isSingleMetricViewerLinkVisible) {
      actions.push({
        render: (annotation) => {
          const isDrillDownAvailable = isTimeSeriesViewJob(this.getJob(annotation.job_id));
          const openInSingleMetricViewerTooltipText = isDrillDownAvailable ? (
            <FormattedMessage
              id="xpack.ml.annotationsTable.openInSingleMetricViewerTooltip"
              defaultMessage="Open in Single Metric Viewer"
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.annotationsTable.jobConfigurationNotSupportedInSingleMetricViewerTooltip"
              defaultMessage="Job configuration not supported in Single Metric Viewer"
            />
          );
          const openInSingleMetricViewerAriaLabelText = isDrillDownAvailable ? (
            <FormattedMessage
              id="xpack.ml.annotationsTable.openInSingleMetricViewerAriaLabel"
              defaultMessage="Open in Single Metric Viewer"
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.annotationsTable.jobConfigurationNotSupportedInSingleMetricViewerAriaLabel"
              defaultMessage="Job configuration not supported in Single Metric Viewer"
            />
          );

          return (
            <EuiToolTip position="bottom" content={openInSingleMetricViewerTooltipText}>
              <EuiButtonIcon
                onClick={() => this.openSingleMetricView(annotation)}
                disabled={!isDrillDownAvailable}
                iconType="stats"
                aria-label={openInSingleMetricViewerAriaLabelText}
              />
            </EuiToolTip>
          );
        },
      });
    }

    const getRowProps = (item) => {
      return {
        onMouseOver: () => this.onMouseOverRow(item),
        onMouseLeave: () => this.onMouseLeaveRow(),
      };
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'event',
        name: 'Event',
        multiSelect: 'or',
        options: this.state.filterOptions.map((field) => ({
          value: field.key,
          name: field.key,
          view: `${field.key} (${field.doc_count})`,
        })),
      },
    ];

    if (
      this.props.chartDetails?.entityData?.entities &&
      this.props.chartDetails?.entityData?.entities.length > 0
    ) {
      this.props.chartDetails?.entityData?.entities.forEach((entity) => {
        if (entity.fieldType === 'partition_field') {
          columns.push({
            field: 'partition_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.partitionColumnName', {
              defaultMessage: 'Partition',
            }),
            sortable: true,
          });
        }

        if (entity.fieldType === 'over_field') {
          columns.push({
            field: 'over_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.overColumnName', {
              defaultMessage: 'Over',
            }),
            sortable: true,
          });
        }
        if (entity.fieldType === 'by_field') {
          columns.push({
            field: 'over_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.byColumnName', {
              defaultMessage: 'By',
            }),
            sortable: true,
          });
        }
      });

      filters.push({
        type: 'field_value_toggle',
        field: 'partition_field_value',
        name: 'Current Series',
        value: this.props.chartDetails.entityData.entities[0].fieldValue,
      });
    }
    const search = {
      box: {
        incremental: true,
        schema: true,
      },
      defaultQuery: 'event:(user)',
      filters: filters,
    };

    columns.push({
      align: RIGHT_ALIGNMENT,
      width: '60px',
      name: i18n.translate('xpack.ml.annotationsTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions,
    });

    return (
      <Fragment>
        <EuiInMemoryTable
          className="eui-textOverflowWrap"
          compressed={true}
          items={annotations}
          columns={columns}
          pagination={{
            pageSizeOptions: [5, 10, 25],
          }}
          sorting={this.sorting}
          search={search}
          rowProps={getRowProps}
        />
      </Fragment>
    );
  }
}
