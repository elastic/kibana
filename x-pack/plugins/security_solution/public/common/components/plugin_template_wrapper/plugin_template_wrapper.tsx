/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../lib/kibana';

interface PluginTemplateWrapperProps {
  /**
   * Accepts all the values from KibanaPageTemplate, as well as `noData` which centers the page contents.
   */
  template?: KibanaPageTemplateProps['template'] | 'noData';
}

/**
 * Uses securityLayout service to retrieve shared plugin wrapper component and renders plugin routes / children inside of it.
 *
 * The `template` prop can be used to alter the page layout for a given plugin route / all routes within a plugin - depending on the nesting.
 */
export const PluginTemplateWrapper: FC<PluginTemplateWrapperProps> = ({ children, template }) => {
  const {
    services: {
      securityLayout: { getPluginWrapper },
    },
  } = useKibana();

  const Wrapper = getPluginWrapper();

  return <Wrapper template={template}>{children}</Wrapper>;
};
