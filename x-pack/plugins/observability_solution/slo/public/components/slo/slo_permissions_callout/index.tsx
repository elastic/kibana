/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { usePermissions } from '../../../hooks/use_permissions';

export function SloPermissionsCallout() {
  const { data: permissions, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  if (permissions?.hasAllReadRequested || permissions?.hasAllWriteRequested) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.slo.permissionsCallout.title', {
          defaultMessage: 'Insufficient Permissions',
        })}
      >
        <p>
          <FormattedMessage
            id="xpack.slo.permissionsCallout.message"
            defaultMessage="You do not have sufficient permissions to view or edit SLO definitions. Please contact your system administrator."
          />
        </p>
        <EuiLink
          data-test-subj="sloSloPermissionsCalloutReadTheDocumentationLink"
          href="https://www.elastic.co/guide/en/observability/current/slo-privileges.html"
          target="_blank"
        >
          {i18n.translate('xpack.slo.permissionsCallout.readDocumentation', {
            defaultMessage: 'Read the documentation',
          })}
        </EuiLink>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
