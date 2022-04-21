/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { UptimeThemeContext } from '../../../../contexts';
import { MonitorLocation } from '../../../../../common/runtime_types';
import { SHORT_TIMESPAN_LOCALE, SHORT_TS_LOCALE } from '../../../../../common/constants';
import { AvailabilityReporting } from '..';
import { getShortTimeStamp } from '../../../overview/monitor_list/columns/monitor_status_column';

// Set height so that it remains within panel, enough height to display 7 locations tags
const TagContainer = styled.div`
  max-height: 246px;
  overflow: hidden;
`;

interface Props {
  locations: MonitorLocation[];
}

export interface StatusTag {
  label: string;
  timestamp?: string;
  color: string;
  availability?: number;
  status: 'up' | 'down';
}

export const LocationStatusTags = ({ locations }: Props) => {
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);

  const allLocations: StatusTag[] = [];
  const prevLocal: string = moment.locale() ?? 'en';

  const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;
  if (!shortLocale) {
    moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
  }

  locations.forEach((item: MonitorLocation) => {
    allLocations.push({
      label: item.geo.name!,
      timestamp: getShortTimeStamp(moment(new Date(item.timestamp).valueOf())),
      color: item.summary.down === 0 ? gray : danger,
      availability: (item.up_history / (item.up_history + item.down_history)) * 100,
      status: item.summary.down === 0 ? 'up' : 'down',
    });
  });

  // Need to reset locale so it doesn't effect other parts of the app
  moment.locale(prevLocal);

  // Sort lexicographically by label
  allLocations.sort((a, b) => {
    return a.label > b.label ? 1 : b.label > a.label ? -1 : 0;
  });

  if (allLocations.length === 0) {
    return null;
  }

  return (
    <>
      <TagContainer>
        <AvailabilityReporting allLocations={allLocations} />
      </TagContainer>
    </>
  );
};
