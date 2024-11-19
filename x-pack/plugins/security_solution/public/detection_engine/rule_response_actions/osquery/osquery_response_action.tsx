/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { ResponseActionFormField } from './osquery_response_action_form_field';
import type { ArrayItem } from '../../../shared_imports';
import { UseField } from '../../../shared_imports';
import { useKibana } from '../../../common/lib/kibana';
import { NOT_AVAILABLE, PERMISSION_DENIED, SHORT_EMPTY_TITLE } from './translations';

interface OsqueryResponseActionProps {
  item: ArrayItem;
}

const GhostFormField = () => <></>;

export const OsqueryResponseAction = React.memo((props: OsqueryResponseActionProps) => {
  const { osquery, application } = useKibana().services;
  const isMounted = useIsMounted();

  // serverless component that is returned when users do not have Endpoint.Complete tier
  const UpsellingComponent = useUpsellingComponent(
    ProductFeatureKey.osqueryAutomatedResponseActions
  );

  if (osquery) {
    const { disabled, permissionDenied } = osquery.fetchInstallationStatus();
    const disabledOsqueryPermission = !(
      application?.capabilities?.osquery?.writeLiveQueries ||
      (application?.capabilities?.osquery?.runSavedQueries &&
        (application?.capabilities?.osquery?.readSavedQueries ||
          application?.capabilities?.osquery?.readPacks))
    );

    if (UpsellingComponent) {
      return <UpsellingComponent />;
    }

    if (permissionDenied || disabledOsqueryPermission) {
      return (
        <>
          <UseField path={`${props.item.path}.params`} component={GhostFormField} />
          <EuiEmptyPrompt
            title={<h2>{PERMISSION_DENIED}</h2>}
            titleSize="xs"
            iconType="logoOsquery"
            body={
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.osquery.action.missingPrivileges"
                  defaultMessage="To access this page, ask your administrator for {osquery} Kibana privileges."
                  values={{
                    osquery: <EuiCode>{'osquery'}</EuiCode>,
                  }}
                />
              </p>
            }
          />
        </>
      );
    }

    if (disabled) {
      return (
        <>
          <UseField path={`${props.item.path}.params`} component={GhostFormField} />
          <EuiEmptyPrompt
            iconType="logoOsquery"
            title={<h2>{SHORT_EMPTY_TITLE}</h2>}
            titleSize="xs"
            body={<p>{NOT_AVAILABLE}</p>}
          />
        </>
      );
    }

    if (isMounted()) {
      return (
        <UseField
          path={`${props.item.path}.params`}
          component={ResponseActionFormField}
          readDefaultValueOnForm={!props.item.isNew}
        />
      );
    }
  }

  return null;
});
OsqueryResponseAction.displayName = 'OsqueryResponseAction';
