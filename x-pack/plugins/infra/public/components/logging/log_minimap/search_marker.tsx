/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';

import euiStyled, { keyframes } from '../../../../../../common/eui_styled_components';
import { LogEntryTime } from '../../../../common/log_entry';
import { SearchSummaryBucket } from '../../../../common/log_search_summary';
import { SearchMarkerTooltip } from './search_marker_tooltip';

interface SearchMarkerProps {
  bucket: SearchSummaryBucket;
  height: number;
  width: number;
  jumpToTarget: (target: LogEntryTime) => void;
}

interface SearchMarkerState {
  hoveredPosition: ClientRect | null;
}

export class SearchMarker extends React.PureComponent<SearchMarkerProps, SearchMarkerState> {
  public readonly state = {
    hoveredPosition: null,
  };

  public handleClick: React.MouseEventHandler<SVGGElement> = evt => {
    evt.stopPropagation();

    this.props.jumpToTarget(this.props.bucket.representative.fields);
  };

  public handleMouseEnter: React.MouseEventHandler<SVGGElement> = evt => {
    this.setState({
      hoveredPosition: evt.currentTarget.getBoundingClientRect(),
    });
  };

  public handleMouseLeave: React.MouseEventHandler<SVGGElement> = () => {
    this.setState({
      hoveredPosition: null,
    });
  };

  public render() {
    const { bucket, height, width } = this.props;
    const { hoveredPosition } = this.state;

    const bulge =
      bucket.count > 1 ? (
        <SearchMarkerForegroundRect x="-2" y="-2" width="4" height={height + 2} rx="2" ry="2" />
      ) : (
        <>
          <SearchMarkerForegroundRect x="-1" y="0" width="2" height={height} />
          <SearchMarkerForegroundRect
            x="-2"
            y={height / 2 - 2}
            width="4"
            height="4"
            rx="2"
            ry="2"
          />
        </>
      );

    return (
      <>
        {hoveredPosition ? (
          <SearchMarkerTooltip markerPosition={hoveredPosition}>
            <FormattedMessage
              id="xpack.infra.logs.searchResultTooltip"
              defaultMessage="{bucketCount, plural, one {# search result} other {# search results}}"
              values={{
                bucketCount: bucket.count,
              }}
            />
          </SearchMarkerTooltip>
        ) : null}
        <SearchMarkerGroup
          onClick={this.handleClick}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <SearchMarkerBackgroundRect x="0" y="0" width={width} height={height} />
          {bulge}
        </SearchMarkerGroup>
      </>
    );
  }
}

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const SearchMarkerGroup = euiStyled.g`
  animation: ${fadeInAnimation} ${props => props.theme.eui.euiAnimSpeedExtraSlow} ease-in both;
`;

const SearchMarkerBackgroundRect = euiStyled.rect`
  fill: ${props => props.theme.eui.euiColorSecondary};
  opacity: 0;
  transition: opacity ${props => props.theme.eui.euiAnimSpeedNormal} ease-in;

  ${SearchMarkerGroup}:hover & {
    opacity: 0.2;
  }
`;

const SearchMarkerForegroundRect = euiStyled.rect`
  fill: ${props => props.theme.eui.euiColorSecondary};
`;
