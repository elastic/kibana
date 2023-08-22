/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { TimelineType } from '../../../common/api/timeline';

import { TimelinesPage } from './timelines_page';

import { appendSearch } from '../../common/components/link_to/helpers';

import { TIMELINES_PATH } from '../../../common/constants';

const timelinesPagePath = `${TIMELINES_PATH}/:tabName(${TimelineType.default}|${TimelineType.template})`;
const timelinesDefaultPath = `${TIMELINES_PATH}/${TimelineType.default}`;

export const Timelines = React.memo(() => (
  <Routes>
    <Route exact path={timelinesPagePath}>
      <TimelinesPage />
    </Route>
    <Route
      path={TIMELINES_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={`${timelinesDefaultPath}${appendSearch(search)}`} />
      )}
    />
  </Routes>
));

Timelines.displayName = 'Timelines';
