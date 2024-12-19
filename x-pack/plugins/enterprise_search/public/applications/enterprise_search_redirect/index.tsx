/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Redirect, useLocation } from 'react-router-dom';

import { Routes, Route } from '@kbn/shared-ux-router';

import { NotFound } from '../applications/components/not_found';

const RedirectWithReplace = () => {
  const location = useLocation();
  const newPath = location.pathname.replace('/enterprise_search', '/elasticsearch');
  return <Redirect to={newPath} />;
};

export const Applications = () => {
  return (
    <Routes>
      <Route path="/enterprise_search/*" component={RedirectWithReplace} />
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
