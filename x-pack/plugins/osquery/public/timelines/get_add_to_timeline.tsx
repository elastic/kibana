/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { ServicesWrapperProps } from '../shared_components/services_wrapper';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export interface AddToTimelinePayload {
  query: [string, string];
  isIcon?: true;
}

export const SECURITY_APP_NAME = 'Security';
export const getAddToTimeline = (
  timelines: ServicesWrapperProps['services']['timelines'],
  appName?: string
) => {
  if (!timelines || appName !== SECURITY_APP_NAME) {
    return;
  }

  const { getAddToTimelineButton } = timelines.getHoverActions();

  return (payload: AddToTimelinePayload) => {
    const {
      query: [field, value],
      isIcon,
    } = payload;

    const providerA = {
      and: [],
      enabled: true,
      excluded: false,
      id: value,
      kqlQuery: '',
      name: value,
      queryMatch: {
        field,
        value,
        operator: ':' as const,
      },
    };

    return getAddToTimelineButton({
      dataProvider: providerA,
      field: value,
      ownFocus: false,
      ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
    });
  };
};
