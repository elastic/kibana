/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../common/lib/kibana';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export interface AddToTimelineButtonProps {
  field: string;
  value: string;
  isIcon?: true;
}

export const SECURITY_APP_NAME = 'Security';
export const AddToTimelineButton = (props: AddToTimelineButtonProps) => {
  const { timelines, appName } = useKibana().services;
  const { field, value, isIcon } = props;

  if (!timelines || appName !== SECURITY_APP_NAME || !value) {
    return null;
  }

  const { getAddToTimelineButton } = timelines.getHoverActions();

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
