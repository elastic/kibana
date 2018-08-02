/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import numeral from '@elastic/numeral';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { asMillis } from '../../../../../../utils/formatters';
import { Indicator } from '../../../../../shared/charts/Legend';
import {
  SPAN_DURATION,
  SPAN_NAME
} from '../../../../../../../common/constants';
import {
  unit,
  units,
  px,
  colors,
  fontSizes,
  truncate
} from '../../../../../../style/variables';
import TooltipOverlay, {
  fieldNameHelper
} from '../../../../../shared/TooltipOverlay';

const DetailsWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid ${colors.gray4};
  padding: ${px(unit)} 0;
  position: relative;
`;

const DetailsElement = styled.div`
  min-width: 0;
  max-width: 50%;
  line-height: 1.5;
`;

const DetailsHeader = styled.div`
  font-size: ${fontSizes.small};
  color: ${colors.gray3};

  span {
    cursor: help;
  }
`;

const DetailsText = styled.div`
  font-size: ${fontSizes.large};
`;

const SpanName = styled.div`
  ${truncate('100%')};
`;

const LegendIndicator = styled(Indicator)`
  display: inline-block;
`;

function getSpanLabel(type) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return 'Navigation timing';
    default:
      return type;
  }
}

function StickyProperties({ span, totalDuration }) {
  const spanDuration = get(span, SPAN_DURATION);
  const relativeDuration = spanDuration / totalDuration;
  const spanName = get(span, SPAN_NAME);
  const spanTypeLabel = getSpanLabel(span.type);
  const spanTypeColor = 'red'; // TODO

  return (
    <DetailsWrapper>
      <DetailsElement>
        <DetailsHeader>
          <TooltipOverlay content={fieldNameHelper('span.name')}>
            <span>Name</span>
          </TooltipOverlay>
        </DetailsHeader>
        <DetailsText>
          <TooltipOverlay content={`${spanName || 'N/A'}`}>
            <SpanName>{spanName || 'N/A'}</SpanName>
          </TooltipOverlay>
        </DetailsText>
      </DetailsElement>
      <DetailsElement>
        <DetailsHeader>
          <TooltipOverlay content={fieldNameHelper('span.type')}>
            <span>Type</span>
          </TooltipOverlay>
        </DetailsHeader>
        <DetailsText>
          <LegendIndicator radius={units.minus - 1} color={spanTypeColor} />
          {spanTypeLabel}
        </DetailsText>
      </DetailsElement>
      <DetailsElement>
        <DetailsHeader>
          <TooltipOverlay content={fieldNameHelper('span.duration.us')}>
            <span>Duration</span>
          </TooltipOverlay>
        </DetailsHeader>
        <DetailsText>{asMillis(spanDuration)}</DetailsText>
      </DetailsElement>
      <DetailsElement>
        <DetailsHeader>% of total time</DetailsHeader>
        <DetailsText>{numeral(relativeDuration).format('0.00%')}</DetailsText>
      </DetailsElement>
    </DetailsWrapper>
  );
}

StickyProperties.propTypes = {
  span: PropTypes.object.isRequired,
  totalDuration: PropTypes.number.isRequired
};

export default StickyProperties;
