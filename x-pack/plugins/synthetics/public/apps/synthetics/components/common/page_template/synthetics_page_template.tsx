/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { ClientPluginsStart } from '../../../../../plugin';

export const WrappedPageTemplate = (props: LazyObservabilityPageTemplateProps) => {
  const { observabilityShared } = useKibana<ClientPluginsStart>().services;
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;

  return <PageTemplateComponent {...props} />;
};

export const SyntheticsPageTemplateComponent = euiStyled(WrappedPageTemplate)`
  &&& {
    .euiPageHeaderContent__top {
      flex-wrap: wrap;
      .euiTitle {
        min-width: 160px;
      }
    }
  }
`;
