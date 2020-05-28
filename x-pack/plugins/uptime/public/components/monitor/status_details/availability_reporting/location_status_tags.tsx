/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { UptimeThemeContext } from '../../../../contexts';
import { MonitorLocation } from '../../../../../common/runtime_types';
import { SHORT_TIMESPAN_LOCALE, SHORT_TS_LOCALE } from '../../../../../common/constants';
import { AvailabilityReporting } from '../index';
import { TagLabel } from './tag_label';
import { LocationAvailability } from './location_status';

// Set height so that it remains within panel, enough height to display 7 locations tags
const TagContainer = styled.div`
  max-height: 229px;
  overflow: hidden;
  margin-top: auto;
`;

const OtherLocationsDiv = styled.div`
  padding-left: 18px;
`;

interface Props {
  locations: MonitorLocation[];
  ups: number;
  downs: number;
}

export interface StatusTag {
  label: string;
  timestamp: number;
  color: string;
  availability: number;
}

export const LocationStatusTags = ({ locations, ups, downs }: Props) => {
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);

  const allLocations: StatusTag[] = [];
  const prevLocal: string = moment.locale() ?? 'en';
  const totalUps = 0;
  const totalDowns = 0;

  const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;
  if (!shortLocale) {
    moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
  }

  locations.forEach((item: MonitorLocation) => {
    allLocations.push({
      label: item.geo.name,
      timestamp: moment(new Date(item.timestamp).valueOf()).fromNow(),
      color: item.summary.down === 0 ? gray : danger,
      availability: (item.ups / (item.ups + item.downs)) * 100,
    });
  });

  // Need to reset locale so it doesn't effect other parts of the app
  moment.locale(prevLocal);

  // Sort lexicographically by label
  allLocations.sort((a, b) => {
    return a.label > b.label ? 1 : b.label > a.label ? -1 : 0;
  });

  return (
    <>
      <TagContainer>
        <AvailabilityReporting ups={ups} downs={downs} />
        <EuiSpacer size="s" />
        {allLocations.map((item, ind) => (
          <LocationAvailability locationStatus={item} key={ind} />
        ))}
      </TagContainer>
      {locations.length > 7 && (
        <OtherLocationsDiv>
          <EuiText color="subdued">
            <h4>
              <FormattedMessage
                id="xpack.uptime.locationMap.locations.tags.others"
                defaultMessage="{otherLoc} Others ..."
                values={{
                  otherLoc: locations.length - 7,
                }}
              />
            </h4>
          </EuiText>
        </OtherLocationsDiv>
      )}
    </>
  );
};
