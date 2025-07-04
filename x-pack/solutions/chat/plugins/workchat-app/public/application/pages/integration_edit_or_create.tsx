/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { IntegrationEditView } from '../components/integrations/edit/integration_edit_view';

const newIntegrationId = 'create';

export const WorkChatIntegrationEditOrCreatePage: React.FC<{}> = () => {
  const { integrationId: integrationIdFromParams } = useParams<{
    integrationId: string;
  }>();

  const integrationId = useMemo(() => {
    return integrationIdFromParams === newIntegrationId ? undefined : integrationIdFromParams;
  }, [integrationIdFromParams]);

  return <IntegrationEditView integrationId={integrationId} />;
};
