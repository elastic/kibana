/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { TimelineType } from '../../../common/types/timeline/api';

import { TimelinesPage } from './timelines_page';

import { appendSearch } from '../../common/components/link_to/helpers';

import { TIMELINES_PATH } from '../../../common/constants';

const timelinesDefaultPath = `${TIMELINES_PATH}/${TimelineType.default}`;

const RedirectRoute = () => {
  const { search = '' } = useLocation();

  return <Redirect to={`${timelinesDefaultPath}${appendSearch(search)}`} />;
};

export const Timelines = React.memo(() => (
  <Routes>
    <Route exact path={`${TIMELINES_PATH}/${TimelineType.default}`}>
      <TimelinesPage />
    </Route>
    <Route exact path={`${TIMELINES_PATH}/${TimelineType.template}`}>
      <TimelinesPage />
    </Route>
    <Route path="*">
      <RedirectRoute />
    </Route>
  </Routes>
));

Timelines.displayName = 'Timelines';
