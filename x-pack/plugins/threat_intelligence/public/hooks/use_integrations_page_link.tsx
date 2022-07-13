/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaBasePath } from './use_kibana_base_path';

export const useIntegrationsPageLink = () =>
  `${useKibanaBasePath()}/app/integrations/browse?q=threat%20intelligence`;
