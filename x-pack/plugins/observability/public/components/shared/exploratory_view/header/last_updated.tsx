/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChartCreationInfo } from './chart_creation_info';

export interface ChartTimeRange {
  lastUpdated: number;
  to?: number;
  from?: number;
}

interface Props {
  chartTimeRange?: ChartTimeRange;
}

export function LastUpdated({ chartTimeRange }: Props) {
  const { lastUpdated } = chartTimeRange || {};
  const [refresh, setRefresh] = useState(() => Date.now());

  useEffect(() => {
    const interVal = setInterval(() => {
      setRefresh(Date.now());
    }, 5000);

    return () => {
      clearInterval(interVal);
    };
  }, []);

  useEffect(() => {
    setRefresh(Date.now());
  }, [lastUpdated]);

  if (!lastUpdated) {
    return null;
  }

  const isWarning = moment().diff(moment(lastUpdated), 'minute') > 5;
  const isDanger = moment().diff(moment(lastUpdated), 'minute') > 10;

  return (
    <EuiText color={isDanger ? 'danger' : isWarning ? 'warning' : 'subdued'} size="s">
      <StyledToolTipWrapper
        as={EuiToolTip}
        position="top"
        content={<ChartCreationInfo {...chartTimeRange} />}
      >
        <EuiIcon type="iInCircle" />
      </StyledToolTipWrapper>{' '}
      <FormattedMessage
        id="xpack.observability.expView.lastUpdated.label"
        defaultMessage="Last Updated: {updatedDate}"
        values={{
          updatedDate: moment(lastUpdated).from(refresh),
        }}
      />
    </EuiText>
  );
}

export const StyledToolTipWrapper = styled.div`
  min-width: 30vw;
`;
