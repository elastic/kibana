/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const RedirectToDasboards = () => {
  const urlString = '/app/dashboards';

  return <a href={urlString}>Go to Dashboard</a>;
};

export const RedirectToGeneralDasboards = () => {
  const urlString = '/app/dashboards#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

  return <a href={urlString}>Go to Cluster Overview</a>;
};