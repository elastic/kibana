/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { NotFoundPage } from '../../../app/404';
import { MANAGEMENT_ROUTING_EVENT_FILTERS_PATH } from '../../common/constants';
import { EventFiltersList } from './view/event_filters_list';

export const EventFiltersContainer = () => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH} exact component={EventFiltersList} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
};
