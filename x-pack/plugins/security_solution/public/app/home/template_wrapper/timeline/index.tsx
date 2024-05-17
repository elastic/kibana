/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React from 'react';
import { TimelineId } from '../../../../../common/types/timeline';
import { useResolveRedirect } from '../../../../common/hooks/use_resolve_redirect';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { TimelineWrapper } from '../../../../timelines/wrapper';

/**
 * Adding timeline to the Security Solution plugin
 */
export const Timeline = React.memo(() => {
  useResolveRedirect();

  const { onAppLeave } = useKibana().services;

  return (
    <TimelineWrapper timelineId={TimelineId.active} onAppLeave={onAppLeave ? onAppLeave : noop} />
  );
});

Timeline.displayName = 'Timeline';
