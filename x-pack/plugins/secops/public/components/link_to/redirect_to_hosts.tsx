/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

export const RedirectToHostsPage = () => {
  return <Redirect to={'/hosts'} />;
};

export const getHostsUrl = () => {
  return '#/link-to/hosts';
};
