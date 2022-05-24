/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Table for displaying annotations. This is mostly a copy of the forecasts table.
 * This version supports both fetching the annotations by itself (used in the jobs list) and
 * getting the annotations via props (used in Anomaly Explorer and Single Series Viewer).
 */

import { uniq } from 'lodash';

import PropTypes from 'prop-types';
import React, { Component, Fragment, useContext } from 'react';
import memoizeOne from 'memoize-one';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

import { addItemToRecentlyAccessed } from '../../../util/recently_accessed';
import { ml } from '../../../services/ml_api_service';
import { mlJobService } from '../../../services/job_service';
import { mlTableService } from '../../../services/table_service';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../../../common/constants/search';
import {
  getLatestDataOrBucketTimestamp,
  isTimeSeriesViewJob,
} from '../../../../../common/util/job_utils';

import { annotationsRefresh$, annotationsRefreshed } from '../../../services/annotations_service';
import {
  ANNOTATION_EVENT_USER,
  ANNOTATION_EVENT_DELAYED_DATA,
} from '../../../../../common/constants/annotations';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../../common/constants/locator';
import { timeFormatter } from '../../../../../common/util/date_utils';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';
import { DatafeedChartFlyout } from '../../../jobs/jobs_list/components/datafeed_chart_flyout';

const editAnnotationsText = (
  <FormattedMessage
    id="xpack.ml.annotationsTable.editAnnotationsTooltip"
    defaultMessage="Edit annotation"
  />
);
const viewDataFeedText = (
  <FormattedMessage
    id="xpack.ml.annotationsTable.datafeedChartTooltip"
    defaultMessage="Datafeed chart"
  />
);

const CURRENT_SERIES = 'current_series';
/**
 * Table component for rendering the lists of annotations for an ML job.
 */
class AnnotationsTableUI extends Component {
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
      queryText: `event:(${ANNOTATION_EVENT_USER} or ${ANNOTATION_EVENT_DELAYED_DATA})`,
      searchError: undefined,
      jobId:
        Array.isArray(this.props.jobs) &&
        this.props.jobs.length > 0 &&
        this.props.jobs[0] !== undefined
          ? this.props.jobs[0].job_id
          : undefined,
      datafeedFlyoutVisible: false,
      datafeedEnd: null,
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
        .getAnnotations$({
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
    } else {
      this.setState({
        annotations: [],
        isLoading: false,
        jobId: undefined,
      });
    }
  }

  getAnnotationsWithExtraInfo = memoizeOne((annotations) => {
    // if there is a specific view/chart entities that the annotations can be scoped to
    // add a new column called 'current_series'
    if (Array.isArray(this.props.chartDetails?.entityData?.entities)) {
      return annotations.map((annotation) => {
        const allMatched = this.props.chartDetails?.entityData?.entities.every(
          ({ fieldType, fieldValue }) => {
            const field = `${fieldType}_value`;
            return !(!annotation[field] || annotation[field] !== fieldValue);
          }
        );
        return { ...annotation, [CURRENT_SERIES]: allMatched };
      });
    } else {
      // if not make it return the original annotations
      return annotations;
    }
  });

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
      });
      annotationsRefreshed();
    }
  }

  previousJobId = undefined;
  componentDidUpdate() {
    if (
      Array.isArray(this.props.jobs) &&
      this.props.jobs.length > 0 &&
      this.previousJobId !== this.props.jobs[0].job_id &&
      this.props.annotations === undefined &&
      this.state.isLoading === false &&
      this.state.jobId !== this.props.jobs[0].job_id
    ) {
      annotationsRefreshed();
      this.previousJobId = this.props.jobs[0].job_id;
    }
  }

  componentWillUnmount() {
    if (this.annotationsRefreshSubscription !== null) {
      this.annotationsRefreshSubscription.unsubscribe();
    }
  }

  openSingleMetricView = async (annotation = {}) => {
    const {
      services: {
        application: { navigateToUrl },
        share,
      },
    } = this.props.kibana;

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
    const timeRange = {
      from,
      to,
      mode: 'absolute',
    };
    let mlTimeSeriesExplorer = {};
    const entityCondition = {};

    if (annotation.timestamp !== undefined && annotation.end_timestamp !== undefined) {
      mlTimeSeriesExplorer = {
        zoom: {
          from: new Date(annotation.timestamp).toISOString(),
          to: new Date(annotation.end_timestamp).toISOString(),
        },
      };

      if (annotation.timestamp < dataCounts.earliest_record_timestamp) {
        timeRange.from = new Date(annotation.timestamp).toISOString();
      }

      if (annotation.end_timestamp > dataCounts.latest_record_timestamp) {
        timeRange.to = new Date(annotation.end_timestamp).toISOString();
      }
    }

    // if the annotation is at the series level
    // then pass the partitioning field(s) and detector index to the Single Metric Viewer
    if (annotation.detector_index !== undefined) {
      mlTimeSeriesExplorer.detectorIndex = annotation.detector_index;
    }
    if (annotation.partition_field_value !== undefined) {
      entityCondition[annotation.partition_field_name] = annotation.partition_field_value;
    }

    if (annotation.over_field_value !== undefined) {
      entityCondition[annotation.over_field_name] = annotation.over_field_value;
    }

    if (annotation.by_field_value !== undefined) {
      // Note that analyses with by and over fields, will have a top-level by_field_name,
      // but the by_field_value(s) will be in the nested causes array.
      entityCondition[annotation.by_field_name] = annotation.by_field_value;
    }
    mlTimeSeriesExplorer.entities = entityCondition;
    // appState.mlTimeSeriesExplorer = mlTimeSeriesExplorer;

    const mlLocator = share.url.locators.get(ML_APP_LOCATOR);
    const singleMetricViewerLink = await mlLocator.getUrl(
      {
        page: ML_PAGES.SINGLE_METRIC_VIEWER,
        pageState: {
          timeRange,
          refreshInterval: {
            display: 'Off',
            pause: true,
            value: 0,
          },
          jobIds: [job.job_id],
          query: {
            query_string: {
              analyze_wildcard: true,
              query: '*',
            },
          },
          ...mlTimeSeriesExplorer,
        },
      },
      { absolute: true }
    );

    addItemToRecentlyAccessed('timeseriesexplorer', job.job_id, singleMetricViewerLink);
    await navigateToUrl(singleMetricViewerLink);
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
    const {
      isSingleMetricViewerLinkVisible = true,
      isNumberBadgeVisible = false,
      annotationUpdatesService,
    } = this.props;

    const { queryText, searchError } = this.state;

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

    const columns = [
      {
        field: 'annotation',
        name: i18n.translate('xpack.ml.annotationsTable.annotationColumnName', {
          defaultMessage: 'Annotation',
        }),
        sortable: true,
        width: '40%',
        scope: 'row',
        'data-test-subj': `mlAnnotationsColumnAnnotation`,
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.ml.annotationsTable.fromColumnName', {
          defaultMessage: 'From',
        }),
        dataType: 'date',
        render: timeFormatter,
        sortable: true,
        'data-test-subj': `mlAnnotationsColumnFrom`,
      },
      {
        field: 'end_timestamp',
        name: i18n.translate('xpack.ml.annotationsTable.toColumnName', {
          defaultMessage: 'To',
        }),
        dataType: 'date',
        render: timeFormatter,
        sortable: true,
        'data-test-subj': `mlAnnotationsColumnTo`,
      },
      {
        field: 'modified_time',
        name: i18n.translate('xpack.ml.annotationsTable.lastModifiedDateColumnName', {
          defaultMessage: 'Last modified date',
        }),
        dataType: 'date',
        render: timeFormatter,
        sortable: true,
        'data-test-subj': `mlAnnotationsColumnModifiedDate`,
      },
      {
        field: 'modified_username',
        name: i18n.translate('xpack.ml.annotationsTable.lastModifiedByColumnName', {
          defaultMessage: 'Last modified by',
        }),
        sortable: true,
        'data-test-subj': `mlAnnotationsColumnModifiedBy`,
      },
      {
        field: 'event',
        name: i18n.translate('xpack.ml.annotationsTable.eventColumnName', {
          defaultMessage: 'Event',
        }),
        sortable: true,
        width: '10%',
        'data-test-subj': `mlAnnotationsColumnEvent`,
      },
    ];

    const jobIds = uniq(annotations.map((a) => a.job_id));
    if (jobIds.length > 1) {
      columns.unshift({
        field: 'job_id',
        name: i18n.translate('xpack.ml.annotationsTable.jobIdColumnName', {
          defaultMessage: 'job ID',
        }),
        sortable: true,
        'data-test-subj': `mlAnnotationsColumnJobId`,
      });
    }

    if (isNumberBadgeVisible) {
      columns.unshift({
        field: 'key',
        name: i18n.translate('xpack.ml.annotationsTable.labelColumnName', {
          defaultMessage: 'Label',
        }),
        sortable: (key) => +key,
        width: '60px',
        render: (key) => {
          return <EuiBadge color="default">{key}</EuiBadge>;
        },
        'data-test-subj': `mlAnnotationsColumnLabel`,
      });
    }

    const actions = [];

    actions.push({
      name: editAnnotationsText,
      description: editAnnotationsText,
      icon: 'pencil',
      type: 'icon',
      onClick: (annotation) => {
        const annotationId = annotation._id;
        const originalAnnotation = annotations.find((d) => d._id === annotationId);

        annotationUpdatesService.setValue(originalAnnotation ?? annotation);
      },
      'data-test-subj': `mlAnnotationsActionEdit`,
    });

    if (this.state.jobId && this.props.jobs[0].analysis_config.bucket_span) {
      // add datafeed modal action
      actions.push({
        name: viewDataFeedText,
        description: viewDataFeedText,
        icon: 'visAreaStacked',
        type: 'icon',
        onClick: (annotation) => {
          this.setState({
            datafeedFlyoutVisible: true,
            datafeedEnd: annotation.end_timestamp,
          });
        },
        'data-test-subj': `mlAnnotationsActionViewDatafeed`,
      });
    }

    if (isSingleMetricViewerLinkVisible) {
      actions.push({
        name: (annotation) => {
          const isDrillDownAvailable = isTimeSeriesViewJob(this.getJob(annotation.job_id));

          if (isDrillDownAvailable) {
            return (
              <FormattedMessage
                id="xpack.ml.annotationsTable.openInSingleMetricViewerTooltip"
                defaultMessage="Open in Single Metric Viewer"
              />
            );
          }
          return (
            <EuiToolTip
              content={
                <FormattedMessage
                  id="xpack.ml.annotationsTable.jobConfigurationNotSupportedInSingleMetricViewerTooltip"
                  defaultMessage="Job configuration not supported in Single Metric Viewer"
                />
              }
            >
              <FormattedMessage
                id="xpack.ml.annotationsTable.openInSingleMetricViewerTooltip"
                defaultMessage="Open in Single Metric Viewer"
              />
            </EuiToolTip>
          );
        },
        description: (annotation) => {
          const isDrillDownAvailable = isTimeSeriesViewJob(this.getJob(annotation.job_id));

          return isDrillDownAvailable
            ? i18n.translate('xpack.ml.annotationsTable.openInSingleMetricViewerAriaLabel', {
                defaultMessage: 'Open in Single Metric Viewer',
              })
            : i18n.translate(
                'xpack.ml.annotationsTable.jobConfigurationNotSupportedInSingleMetricViewerAriaLabel',
                { defaultMessage: 'Job configuration not supported in Single Metric Viewer' }
              );
        },
        enabled: (annotation) => isTimeSeriesViewJob(this.getJob(annotation.job_id)),
        icon: 'visLine',
        type: 'icon',
        onClick: (annotation) => this.openSingleMetricView(annotation),
        'data-test-subj': `mlAnnotationsActionOpenInSingleMetricViewer`,
      });
    }

    const getRowProps = (item) => {
      return {
        'data-test-subj': `mlAnnotationsTableRow row-${item._id}`,
        onMouseOver: () => this.onMouseOverRow(item),
        onMouseLeave: () => this.onMouseLeaveRow(),
      };
    };

    // Build the options to show in the Event type filter.
    // Do not try and run a search using a terms agg on the event field
    // because in 7.9 this field was incorrectly mapped as a text rather than keyword.

    // Always display options for user and delayed data types.
    const countsByEvent = {
      [ANNOTATION_EVENT_USER]: 0,
      [ANNOTATION_EVENT_DELAYED_DATA]: 0,
    };
    annotations.forEach((annotation) => {
      // Default to user type for annotations created in early releases which didn't have an event field
      const event = annotation.event ?? ANNOTATION_EVENT_USER;
      if (countsByEvent[event] === undefined) {
        countsByEvent[event] = 0;
      }
      countsByEvent[event]++;
    });

    const filters = [
      {
        type: 'field_value_selection',
        field: 'event',
        name: 'Event',
        multiSelect: 'or',
        options: Object.entries(countsByEvent).map(([key, docCount]) => ({
          value: key,
          name: key,
          view: `${key} (${docCount})`,
        })),
        'data-test-subj': 'mlAnnotationTableEventFilter',
      },
    ];

    if (this.props.detectors) {
      columns.push({
        name: i18n.translate('xpack.ml.annotationsTable.detectorColumnName', {
          defaultMessage: 'Detector',
        }),
        width: '10%',
        render: (item) => {
          if ('detector_index' in item) {
            return this.props.detectors[item.detector_index].detector_description;
          }
          return '';
        },
      });
    }

    if (Array.isArray(this.props.chartDetails?.entityData?.entities)) {
      // only show the column if the field exists in that job in SMV
      this.props.chartDetails?.entityData?.entities.forEach((entity) => {
        if (entity.fieldType === 'partition_field') {
          columns.push({
            field: 'partition_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.partitionSMVColumnName', {
              defaultMessage: 'Partition',
            }),
            sortable: true,
          });
        }
        if (entity.fieldType === 'over_field') {
          columns.push({
            field: 'over_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.overColumnSMVName', {
              defaultMessage: 'Over',
            }),
            sortable: true,
          });
        }
        if (entity.fieldType === 'by_field') {
          columns.push({
            field: 'by_field_value',
            name: i18n.translate('xpack.ml.annotationsTable.byColumnSMVName', {
              defaultMessage: 'By',
            }),
            sortable: true,
          });
        }
      });
      filters.push({
        type: 'is',
        field: CURRENT_SERIES,
        name: i18n.translate('xpack.ml.annotationsTable.seriesOnlyFilterName', {
          defaultMessage: 'Filter to series',
        }),
      });
    } else {
      // else show all the partition columns in AE because there might be multiple jobs
      columns.push({
        field: 'partition_field_value',
        name: i18n.translate('xpack.ml.annotationsTable.partitionAEColumnName', {
          defaultMessage: 'Partition',
        }),
        sortable: true,
      });
      columns.push({
        field: 'over_field_value',
        name: i18n.translate('xpack.ml.annotationsTable.overAEColumnName', {
          defaultMessage: 'Over',
        }),
        sortable: true,
      });

      columns.push({
        field: 'by_field_value',
        name: i18n.translate('xpack.ml.annotationsTable.byAEColumnName', {
          defaultMessage: 'By',
        }),
        sortable: true,
      });
    }
    const search = {
      defaultQuery: queryText,
      box: {
        incremental: true,
        schema: true,
      },
      filters: filters,
    };

    columns.push(
      {
        align: RIGHT_ALIGNMENT,
        width: '60px',
        name: i18n.translate('xpack.ml.annotationsTable.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions,
        'data-test-subj': `mlAnnotationsColumnActions`,
      },
      {
        // hidden column, for search only
        field: CURRENT_SERIES,
        name: CURRENT_SERIES,
        dataType: 'boolean',
        width: '0px',
        render: () => '',
      }
    );

    const items = this.getAnnotationsWithExtraInfo(annotations);
    return (
      <Fragment>
        <EuiInMemoryTable
          data-test-subj={'mlAnnotationsTable'}
          error={searchError}
          className="eui-textOverflowWrap"
          compressed={true}
          items={items}
          columns={columns}
          pagination={{
            pageSizeOptions: [5, 10, 25],
          }}
          sorting={this.sorting}
          search={search}
          rowProps={getRowProps}
        />
        {this.state.jobId && this.state.datafeedFlyoutVisible && this.state.datafeedEnd ? (
          <DatafeedChartFlyout
            onClose={() => {
              this.setState({
                datafeedFlyoutVisible: false,
              });
            }}
            end={this.state.datafeedEnd}
            jobId={this.state.jobId}
          />
        ) : null}
      </Fragment>
    );
  }
}

export const AnnotationsTable = withKibana((props) => {
  const annotationUpdatesService = useContext(MlAnnotationUpdatesContext);
  return <AnnotationsTableUI annotationUpdatesService={annotationUpdatesService} {...props} />;
});
