/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHealth, EuiSuperSelect } from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { timelineActions } from '../../../store/timeline';
import { EventType } from '../../../store/timeline/model';
import * as i18n from './translations';

interface EventTypeOptionItem {
  value: EventType;
  inputDisplay: React.ReactElement;
}

const AllEuiHealth = styled(EuiHealth)`
  margin-left: -2px;
  svg {
    stroke: #fff;
    stroke-width: 1px;
    stroke-linejoin: round;
    width: 19px;
    height: 19px;
    margin-top: 1px;
    z-index: 1;
  }
`;

const WarningEuiHealth = styled(EuiHealth)`
  margin-left: -17px;
  svg {
    z-index: 0;
  }
`;

const PickEventContainer = styled.div`
  .euiSuperSelect {
    width: 170px;
    max-width: 170px;
    button.euiSuperSelectControl {
      padding-top: 3px;
    }
  }
`;

export const eventTypeOptions: EventTypeOptionItem[] = [
  {
    value: 'all',
    inputDisplay: (
      <AllEuiHealth color="subdued">
        <WarningEuiHealth color="warning">{i18n.ALL_EVENT}</WarningEuiHealth>
      </AllEuiHealth>
    ),
  },
  {
    value: 'raw',
    inputDisplay: <EuiHealth color="subdued">{i18n.RAW_EVENT}</EuiHealth>,
  },
  {
    value: 'alert',
    inputDisplay: <EuiHealth color="warning">{i18n.DETECTION_ALERTS_EVENT}</EuiHealth>,
  },
];

interface PickEventTypeProps {
  eventType: EventType;
  timelineId: string;
}

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({ eventType, timelineId }) => {
  const dispatch = useDispatch();
  const handleChange = useCallback(
    (newEventType: EventType) =>
      dispatch(
        timelineActions.updateEventType({
          id: timelineId,
          eventType: newEventType,
        })
      ),
    [dispatch, timelineId]
  );

  return (
    <PickEventContainer>
      <EuiSuperSelect
        data-test-subj="pick-event-type"
        fullWidth={false}
        valueOfSelected={eventType === 'signal' ? 'alert' : eventType}
        onChange={handleChange}
        options={eventTypeOptions}
      />
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);
