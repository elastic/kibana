/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { ToggleFlyoutTranslations } from '../../alerts/hooks/translations';

export const ManageRulesLink = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const manageRulesUrl = observability.useRulesLink();

  return (
    <EuiLink color="text" href={manageRulesUrl.href}>
      {ToggleFlyoutTranslations.navigateToAlertingButtonContent}
    </EuiLink>
  );
};
