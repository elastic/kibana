/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ExternalReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

export const getLazyFile: React.FC<ExternalReferenceAttachmentViewProps> = (props) => {
  const Content = lazy(() => import('./external_references_content'));

  return (
    <Suspense fallback={null}>
      <Content {...props} />
    </Suspense>
  );
};
