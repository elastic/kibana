/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSectionProps } from '@elastic/eui';
import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const LogsOptimizationPageTemplate = ({
  pageSectionProps,
  ...props
}: LazyObservabilityPageTemplateProps) => {
  const {
    services: { observabilityShared },
  } = useKibanaContextForPlugin();

  return (
    <observabilityShared.navigation.PageTemplate
      pageSectionProps={{ ...defaultPageSectionProps, ...pageSectionProps }}
      {...props}
    />
  );
};

const defaultPageSectionProps: EuiPageSectionProps = {
  grow: true,
  paddingSize: 'none',
};
