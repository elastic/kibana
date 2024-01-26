/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';

export function DependenciesTableServiceMapLink({ href }: { href: string }) {
  return (
    <EuiLink
      data-test-subj="apmDependenciesTableServiceMapLinkViewServiceMapLink"
      href={href}
    >
      {i18n.translate('xpack.apm.dependenciesTable.serviceMapLinkText', {
        defaultMessage: 'View service map',
      })}
    </EuiLink>
  );
}
