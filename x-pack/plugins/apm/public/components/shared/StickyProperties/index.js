/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import moment from 'moment';

import {
  unit,
  units,
  px,
  fontSizes,
  colors,
  truncate
} from '../../../style/variables';

import TooltipOverlay, { fieldNameHelper } from '../../shared/TooltipOverlay';

const PropertiesContainer = styled.div`
  display: flex;
  padding: 0 ${px(units.plus)};
  width: 100%;
  justify-content: flex-start;
  flex-wrap: wrap;
`;

const Property = styled.div`
  width: 33%;
  margin-bottom: ${px(unit)};
`;

const PropertyLabel = styled.div`
  margin-bottom: ${px(units.half)};
  font-size: ${fontSizes.small};
  color: ${colors.gray3};

  span {
    cursor: help;
  }
`;

const PropertyValueDimmed = styled.span`
  color: ${colors.gray3};
`;

const PropertyValue = styled.div`
  display: inline-block;
  line-height: ${px(unit)};
`;

const PropertyValueTruncated = styled.span`
  display: inline-block;
  line-height: ${px(unit)};
  ${truncate('100%')};
`;

function TimestampValue({ timestamp }) {
  const time = moment(timestamp);
  const timeAgo = timestamp ? time.fromNow() : 'N/A';
  const timestampFull = timestamp
    ? time.format('MMMM Do YYYY, HH:mm:ss.SSS')
    : 'N/A';

  return (
    <PropertyValue>
      {timeAgo} <PropertyValueDimmed>({timestampFull})</PropertyValueDimmed>
    </PropertyValue>
  );
}

function getPropertyLabel({ fieldName, label }) {
  if (fieldName) {
    return (
      <PropertyLabel>
        <TooltipOverlay content={fieldNameHelper(fieldName)}>
          <span>{label}</span>
        </TooltipOverlay>
      </PropertyLabel>
    );
  }

  return <PropertyLabel>{label}</PropertyLabel>;
}

function getPropertyValue({ val, fieldName, truncated = false }) {
  if (fieldName === '@timestamp') {
    return <TimestampValue timestamp={val} />;
  }

  if (truncated) {
    return (
      <TooltipOverlay content={String(val)}>
        <PropertyValueTruncated>{String(val)}</PropertyValueTruncated>
      </TooltipOverlay>
    );
  }

  return <PropertyValue>{String(val)}</PropertyValue>;
}

export function StickyProperties({ stickyProperties }) {
  return (
    <PropertiesContainer>
      {stickyProperties &&
        stickyProperties.map((prop, i) => (
          <Property key={i}>
            {getPropertyLabel(prop)}
            {getPropertyValue(prop)}
          </Property>
        ))}
    </PropertiesContainer>
  );
}
