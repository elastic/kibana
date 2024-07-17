/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiSpacer, EuiLink, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
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
        <EuiFlexGroup gutterSize="m" direction="column">
          <FormattedMessage
            id="xpack.slo.permissionsCallout.message"
            defaultMessage="You do not have sufficient permissions to view or edit SLO definitions."
          />

          <EuiFlexItem>
            <FormattedMessage
              id="xpack.slo.permissionsCallout.minimumReadPermissionsRequired"
              defaultMessage="In order to view SLO dashboards and details, you need at least the following permissions on your user's role:"
            />

            <ul>
              <li>
                <FormattedMessage
                  id="xpack.slo.permissionsCallout.readSloPermission"
                  defaultMessage="'read' permission on index pattern: .slo-*"
                />
              </li>
            </ul>
          </EuiFlexItem>

          <EuiFlexItem>
            <FormattedMessage
              id="xpack.slo.permissionsCallout.minimumManagePermissionsRequired"
              defaultMessage="In order to create and manage SLO definitions, you need at least the following permissions on your user's role:"
            />

            <ul>
              <li>
                <FormattedMessage
                  id="xpack.slo.permissionsCallout.writeSloPermission"
                  defaultMessage="'all' permission on index pattern: .slo-*"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.slo.permissionsCallout.writeClusterPermission"
                  defaultMessage="'manage_transform' and 'manage_ingest_pipelines' cluster permissions"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.slo.permissionsCallout.readIndexPermission"
                  defaultMessage="'read' and 'view_index_metadata' index permissions on any index patterns you want to use for creating SLOs"
                />
              </li>
            </ul>
          </EuiFlexItem>

          <EuiLink
            data-test-subj="sloSloPermissionsCalloutReadTheDocumentationLink"
            href="https://www.elastic.co/guide/en/observability/current/slo-privileges.html"
            target="_blank"
          >
            {i18n.translate('xpack.slo.permissionsCallout.readDocumentation', {
              defaultMessage: 'Read the documentation for more details',
            })}
          </EuiLink>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
