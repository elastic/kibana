/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';

export function useManagementLocator(extraPath?: string) {
  const [templatePath, setTemplatePath] = useState<string | null>(null);
  const { basePath } = useSyntheticsSettingsContext();
  const { share, application } = useKibana<ClientPluginsStart>().services;
  const canManageIndices = !!application.capabilities.management?.data?.index_management;
  useEffect(() => {
    if (!canManageIndices) return;
    const managementLocator = share.url.locators.get('MANAGEMENT_APP_LOCATOR');
    managementLocator
      ?.getLocation({ sectionId: 'data', appId: 'index_management' })
      .then(({ app, path }) => setTemplatePath(`${basePath}/app/${app}${path}${extraPath}`));
  }, [share.url.locators, basePath, setTemplatePath, canManageIndices, extraPath]);
  return templatePath;
}
