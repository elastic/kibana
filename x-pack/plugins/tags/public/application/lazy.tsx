/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { lazy, Suspense } from 'react';
import { Props } from './containers/tags_app';

const TagsAppLazy = lazy(() =>
  import('./containers/tags_app').then((module) => ({
    default: module.TagsApp,
  }))
);

export const TagsApp: React.FC<Props> = (props) => (
  <Suspense fallback={<></>}>
    <TagsAppLazy {...props} />
  </Suspense>
);
