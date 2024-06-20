/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';

export const App: React.FC = () => {
  return (
    <>
      <SearchHomepageHeader />
      <SearchHomepageBody />
    </>
  );
};
