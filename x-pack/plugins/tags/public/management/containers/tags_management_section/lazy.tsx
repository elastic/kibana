/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { lazy, Suspense } from 'react';
import { Props } from './tags_management_section';

const TagsManagementSectionLazy = lazy(() =>
  import('./tags_management_section').then((module) => ({
    default: module.TagsManagementSection,
  }))
);

export const TagsManagementSection: React.FC<Props> = (props) => (
  <Suspense fallback={<></>}>
    <TagsManagementSectionLazy {...props} />
  </Suspense>
);
