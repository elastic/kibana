/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { TimelineId } from '../../../../../common/types/timeline';
import { Flyout } from '../../../../timelines/components/flyout';
import { useResolveRedirect } from '../../../../common/hooks/use_resolve_redirect';

// eslint-disable-next-line react/display-name
export const SecuritySolutionBottomBar = React.memo(() => {
  useResolveRedirect();

  const { onAppLeave } = useKibana().services;

  return <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />;
});
