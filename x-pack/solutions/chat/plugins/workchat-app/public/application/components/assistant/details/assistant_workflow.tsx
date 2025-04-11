/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../../hooks/use_navigation';
import { assistantLabels } from '../i18n';
import { appPaths } from '../../../app_paths';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';

interface AssistantWorkflowProps {
  agentId: string;
}

export const AssistantWorkflow: React.FC<AssistantWorkflowProps> = ({ agentId }) => {
  const { createWorkchatUrl } = useNavigation();

  const breadcrumb = useMemo(() => {
    return [
      {
        text: assistantLabels.breadcrumb.assistantsPill,
        href: createWorkchatUrl(appPaths.assistants.list),
      },
      { text: assistantLabels.breadcrumb.assistantWorkflowPill },
    ];
  }, [createWorkchatUrl]);

  useBreadcrumb(breadcrumb);
  return <KibanaPageTemplate.Section paddingSize="m">todo...</KibanaPageTemplate.Section>;
};
