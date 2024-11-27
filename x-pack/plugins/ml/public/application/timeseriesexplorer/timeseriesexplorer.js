/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import PropTypes from 'prop-types';
import React, { createRef } from 'react';

import { i18n } from '@kbn/i18n';
import { context } from '@kbn/kibana-react-plugin/public';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';
import { TimeSeriesExplorerPage } from './timeseriesexplorer_page';

import { mlJobServiceFactory } from '../services/job_service';
import { getTimeseriesexplorerDefaultState } from './timeseriesexplorer_utils';
import { ANOMALY_DETECTION_DEFAULT_TIME_RANGE } from '../../../common/constants/settings';
import { ExplorerNoJobsSelected } from '../explorer/components';
import { TimeSeriesExplorerEmbeddableChart } from './timeseriesexplorer_embeddable_chart';

const containerPadding = 34;

export class TimeSeriesExplorer extends React.Component {
  static contextType = context;

  static propTypes = {
    appStateHandler: PropTypes.func.isRequired,
    autoZoomDuration: PropTypes.number.isRequired,
    bounds: PropTypes.object.isRequired,
    dateFormatTz: PropTypes.string.isRequired,
    lastRefresh: PropTypes.number.isRequired,
    previousRefresh: PropTypes.number,
    selectedJobId: PropTypes.string.isRequired,
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.number,
    zoom: PropTypes.object,
  };

  mlJobService;

  constructor(props, constructorContext) {
    super(props, constructorContext);
    this.mlJobService = mlJobServiceFactory(constructorContext.services.mlServices.mlApi);
  }

  state = getTimeseriesexplorerDefaultState();

  resizeRef = createRef();
  resizeChecker = undefined;
  resizeHandler = () => {
    this.setState({
      svgWidth:
        this.resizeRef.current !== null ? this.resizeRef.current.offsetWidth - containerPadding : 0,
    });
  };

  componentDidMount() {
    // if timeRange used in the url is incorrect
    // perhaps due to user's advanced setting using incorrect date-maths
    const { invalidTimeRangeError } = this.props;
    if (invalidTimeRangeError) {
      if (this.toastNotificationService) {
        this.toastNotificationService.displayWarningToast(
          i18n.translate('xpack.ml.timeSeriesExplorer.invalidTimeRangeInUrlCallout', {
            defaultMessage:
              'The time filter was changed to the full range for this job due to an invalid default time filter. Check the advanced settings for {field}.',
            values: {
              field: ANOMALY_DETECTION_DEFAULT_TIME_RANGE,
            },
          })
        );
      }
    }
    // Required to redraw the time series chart when the container is resized.
    this.resizeChecker = new ResizeChecker(this.resizeRef.current);
    this.resizeChecker.on('resize', () => {
      this.resizeHandler();
    });
    this.resizeHandler();
  }

  componentWillUnmount() {
    this.resizeChecker.destroy();
  }

  render() {
    const mlJobService = this.mlJobService;
    const {
      appStateHandler,
      autoZoomDuration,
      bounds,
      dateFormatTz,
      functionDescription,
      lastRefresh,
      previousRefresh,
      selectedDetectorIndex,
      selectedEntities,
      selectedForecastId,
      selectedJobId,
      zoom,
    } = this.props;
    const { svgWidth } = this.state;

    if (selectedDetectorIndex === undefined || mlJobService.getJob(selectedJobId) === undefined) {
      return (
        <TimeSeriesExplorerPage dateFormatTz={dateFormatTz} resizeRef={this.resizeRef}>
          <ExplorerNoJobsSelected />
        </TimeSeriesExplorerPage>
      );
    }

    const selectedJob = mlJobService.getJob(selectedJobId);

    return (
      <TimeSeriesExplorerPage dateFormatTz={dateFormatTz} resizeRef={this.resizeRef}>
        <TimeSeriesExplorerEmbeddableChart
          chartWidth={svgWidth}
          appStateHandler={appStateHandler}
          autoZoomDuration={autoZoomDuration}
          bounds={bounds}
          dateFormatTz={dateFormatTz}
          lastRefresh={lastRefresh ?? 0}
          previousRefresh={previousRefresh}
          selectedDetectorIndex={selectedDetectorIndex}
          selectedEntities={selectedEntities}
          selectedForecastId={selectedForecastId}
          tableInterval="auto"
          tableSeverity={0}
          zoom={zoom}
          functionDescription={functionDescription}
          selectedJob={selectedJob}
          selectedJobStats={{ state: selectedJob.state, data_counts: selectedJob.data_counts }}
          shouldShowForecastButton
          isEmbeddable={false}
        />
      </TimeSeriesExplorerPage>
    );
  }
}
