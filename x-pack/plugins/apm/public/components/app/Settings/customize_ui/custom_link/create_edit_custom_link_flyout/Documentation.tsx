/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibanaServicesContext } from '../../../../../../context/kibana_services/use_kibana_services_context';

interface Props {
  label: string;
}

export function Documentation({ label }: Props) {
  const { docLinks } = useKibanaServicesContext();
  return <EuiLink href={docLinks.links.apm.customLinks}>{label}</EuiLink>;
}
