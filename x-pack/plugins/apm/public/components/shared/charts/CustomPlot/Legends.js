/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';
import Legend from '../Legend';
import {
  units,
  fontSizes,
  px,
  colors,
  truncate
} from '../../../../style/variables';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const LegendContent = styled.span`
  white-space: nowrap;
  color: ${colors.gray3};
  display: flex;
`;

const TruncatedLabel = styled.span`
  display: inline-block;
  ${truncate(px(units.half * 10))};
`;

const SeriesValue = styled.span`
  margin-left: ${px(units.quarter)};
  color: ${colors.black};
  display: inline-block;
`;

const MoreSeriesContainer = styled.div`
  font-size: ${fontSizes.small};
  color: ${colors.gray3};
`;

function MoreSeries({ hiddenSeriesCount }) {
  if (hiddenSeriesCount <= 0) {
    return null;
  }

  return <MoreSeriesContainer>(+{hiddenSeriesCount})</MoreSeriesContainer>;
}

export default function Legends({
  noHits,
  clickLegend,
  hiddenSeriesCount,
  series,
  seriesEnabledState,
  truncateLegends
}) {
  if (noHits) {
    return null;
  }

  return (
    <Container>
      {series.map((serie, i) => {
        const text = (
          <LegendContent>
            {truncateLegends ? (
              <TruncatedLabel title={serie.title}>{serie.title}</TruncatedLabel>
            ) : (
              serie.title
            )}
            {serie.legendValue && (
              <SeriesValue>{serie.legendValue}</SeriesValue>
            )}
          </LegendContent>
        );
        return (
          <Legend
            key={i}
            onClick={() => clickLegend(i)}
            disabled={seriesEnabledState[i]}
            text={text}
            color={serie.color}
          />
        );
      })}
      <MoreSeries hiddenSeriesCount={hiddenSeriesCount} />
    </Container>
  );
}

Legends.propTypes = {
  chartTitle: PropTypes.string,
  clickLegend: PropTypes.func.isRequired,
  hiddenSeriesCount: PropTypes.number.isRequired,
  noHits: PropTypes.bool.isRequired,
  series: PropTypes.array.isRequired,
  seriesEnabledState: PropTypes.array.isRequired,
  truncateLegends: PropTypes.bool.isRequired
};
