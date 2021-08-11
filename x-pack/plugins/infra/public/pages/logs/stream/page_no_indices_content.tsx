/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLinkProps } from '../../../hooks/use_link_props';
import { LogsPageTemplate } from '../page_template';

export const LogsPageNoIndicesContent = () => {
  const tutorialLinkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial_directory/logging',
  });

  return (
    <LogsPageTemplate
      noDataConfig={{
        solution: 'Observability',
        actions: {
          beats: {
            ...tutorialLinkProps,
          },
        },
        docsLink: '#',
      }}
    />
  );
};
