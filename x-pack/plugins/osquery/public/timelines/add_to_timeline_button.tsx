/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isArray } from 'lodash';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useKibana } from '../common/lib/kibana';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export interface AddToTimelineButtonProps {
  field: string;
  value: string | string[];
  isIcon?: true;
  iconProps?: Record<string, string>;
}

export const SECURITY_APP_NAME = 'Security';
export const AddToTimelineButton = (props: AddToTimelineButtonProps) => {
  const { timelines, appName, analytics, i18n, theme } = useKibana().services;
  const startServices = { analytics, i18n, theme };
  const { field, value, isIcon, iconProps } = props;

  const queryIds = isArray(value) ? value : [value];
  const TimelineIconComponent = useCallback(
    (timelineComponentProps: any) => (
      <EuiButtonIcon iconType="timelines" {...timelineComponentProps} size="xs" {...iconProps} />
    ),
    [iconProps]
  );

  if (!timelines || appName !== SECURITY_APP_NAME || !queryIds.length) {
    return null;
  }

  const { getAddToTimelineButton } = timelines.getHoverActions();

  const providers = queryIds.map((queryId) => ({
    and: [],
    enabled: true,
    excluded: false,
    id: queryId,
    kqlQuery: '',
    name: queryId,
    queryMatch: {
      field,
      value: queryId,
      operator: ':' as const,
    },
  }));

  return getAddToTimelineButton({
    dataProvider: providers,
    field: queryIds[0],
    ownFocus: false,
    ...(isIcon
      ? { showTooltip: true, Component: TimelineIconComponent }
      : { Component: TimelineComponent }),
    startServices,
  });
};
