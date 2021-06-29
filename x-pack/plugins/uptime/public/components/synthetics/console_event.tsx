/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React, { useContext, FC } from 'react';
import { UptimeThemeContext } from '../../contexts';
import { JourneyStep } from '../../../common/runtime_types/ping';

interface Props {
  event: JourneyStep;
}

export const ConsoleEvent: FC<Props> = ({ event }) => {
  const {
    colors: { danger },
  } = useContext(UptimeThemeContext);

  let typeColor: string | undefined;
  if (event.synthetics?.type === 'stderr') {
    typeColor = danger;
  } else {
    typeColor = undefined;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{event['@timestamp']}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: typeColor }}>
        {event.synthetics?.type}
      </EuiFlexItem>
      <EuiFlexItem>{event.synthetics?.payload?.message}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
