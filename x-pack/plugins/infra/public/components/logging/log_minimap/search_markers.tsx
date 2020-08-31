/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import { scaleTime } from 'd3-scale';
import * as React from 'react';

import { LogEntryTime } from '../../../../common/log_entry';
import { SearchMarker } from './search_marker';
import { LogEntriesSummaryHighlightsBucket } from '../../../../common/http_api';

interface SearchMarkersProps {
  buckets: LogEntriesSummaryHighlightsBucket[];
  className?: string;
  end: number;
  start: number;
  width: number;
  height: number;
  jumpToTarget: (target: LogEntryTime) => void;
}

export class SearchMarkers extends React.PureComponent<SearchMarkersProps, {}> {
  public render() {
    const { buckets, start, end, width, height, jumpToTarget, className } = this.props;
    const classes = classNames('minimapSearchMarkers', className);

    if (start >= end || height <= 0 || Object.keys(buckets).length <= 0) {
      return null;
    }

    const yScale = scaleTime().domain([start, end]).range([0, height]);

    return (
      <g transform={`translate(${width / 2}, 0)`} className={classes}>
        {buckets.map((bucket) => (
          <g
            key={`${bucket.representativeKey.time}:${bucket.representativeKey.tiebreaker}`}
            transform={`translate(0, ${yScale(bucket.start)})`}
          >
            <SearchMarker
              bucket={bucket}
              height={yScale(bucket.end) - yScale(bucket.start)}
              width={width}
              jumpToTarget={jumpToTarget}
            />
          </g>
        ))}
      </g>
    );
  }
}
