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
} from '../../style/variables';

import TooltipOverlay, { fieldNameHelper } from '../shared/TooltipOverlay';

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

const PropertyWide = Property.extend`
  width: 66%;
`;

const PropertyLabel = styled.div`
  margin-bottom: ${px(units.half)};
  font-size: ${fontSizes.small};
  color: ${colors.gray3};

  span {
    cursor: help;
  }
`;

const PropertyValue = styled.div`
  display: inline-block;
  line-height: ${px(unit)};
`;

const PropertyValueEmphasis = styled.span`
  color: ${colors.gray3};
`;

const PropertyUrl = styled.span`
  display: inline-block;
  ${truncate('100%')};
  line-height: ${px(unit)};
`;

export function ContextProperties({ timestamp, url, stickyProperties }) {
  const time = moment(timestamp);
  const timeAgo = timestamp ? time.fromNow() : 'N/A';
  const timestampFull = timestamp
    ? time.format('MMMM Do YYYY, HH:mm:ss.SSS')
    : 'N/A';

  return (
    <PropertiesContainer>
      <Property>
        <PropertyLabel>
          <TooltipOverlay content={fieldNameHelper('@timestamp')}>
            <span>Timestamp</span>
          </TooltipOverlay>
        </PropertyLabel>
        <PropertyValue>
          {timeAgo}{' '}
          <PropertyValueEmphasis>({timestampFull})</PropertyValueEmphasis>
        </PropertyValue>
      </Property>
      <PropertyWide>
        <PropertyLabel>
          <TooltipOverlay content={fieldNameHelper('context.request.url.full')}>
            <span>URL</span>
          </TooltipOverlay>
        </PropertyLabel>
        <TooltipOverlay content={url}>
          <PropertyUrl>{url}</PropertyUrl>
        </TooltipOverlay>
      </PropertyWide>
      {stickyProperties &&
        stickyProperties.map(({ label, val, fieldName }, i) => (
          <Property key={i}>
            {fieldName ? (
              <PropertyLabel>
                <TooltipOverlay content={fieldNameHelper(fieldName)}>
                  <span>{label}</span>
                </TooltipOverlay>
              </PropertyLabel>
            ) : (
              <PropertyLabel>{label}</PropertyLabel>
            )}
            <PropertyValue>{String(val)}</PropertyValue>
          </Property>
        ))}
    </PropertiesContainer>
  );
}
