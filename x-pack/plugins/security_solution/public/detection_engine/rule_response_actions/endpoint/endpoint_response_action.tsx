/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { map } from 'lodash';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PACKAGE_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import { NOT_AVAILABLE, PERMISSION_DENIED, SHORT_EMPTY_TITLE } from './translations';
import { UseField, useFormData } from '../../../shared_imports';
import type { ArrayItem } from '../../../shared_imports';
import { ResponseActionFormField } from './endpoint_response_action_form_field';
import { useFetchStatus } from '../use_fetch_status';
import { useUserPrivileges } from '../../../common/components/user_privileges';

interface EndpointResponseActionProps {
  item: ArrayItem;
  editDisabled: boolean;
}
const GhostFormField = () => <></>;

export const EndpointResponseAction = React.memo((props: EndpointResponseActionProps) => {
  const [data] = useFormData();

  const endpointPermissions = useUserPrivileges().endpointPrivileges;
  const { permissionDenied, disabled } = useFetchStatus(PACKAGE_STATUS_ROUTE);

  // TODO verify if this logic sounds about right
  const disabledEndpointPermissions = !(
    !endpointPermissions.canIsolateHost &&
    !endpointPermissions.canKillProcess &&
    !endpointPermissions.canGetRunningProcesses
  );

  if (permissionDenied || disabledEndpointPermissions) {
    return (
      <>
        <UseField path={`${props.item.path}.params`} component={GhostFormField} />
        <EuiEmptyPrompt
          title={<h2>{PERMISSION_DENIED}</h2>}
          titleSize="xs"
          iconType="logoSecurity"
          body={
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.action.missingPrivileges"
                defaultMessage="To access this page, ask your administrator for {endpoint} Kibana privileges."
                values={{
                  endpoint: <EuiCode>{'endpoint'}</EuiCode>,
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
          iconType="logoSecurity"
          title={<h2>{SHORT_EMPTY_TITLE}</h2>}
          titleSize="xs"
          body={<p>{NOT_AVAILABLE}</p>}
        />
      </>
    );
  }

  const usedEndpointCommands = map(data.responseActions, (responseAction) => {
    return responseAction?.params?.command;
  });
  return (
    <UseField
      path={`${props.item.path}.params`}
      componentProps={{
        editDisabled: props.editDisabled,
        usedEndpointCommands,
      }}
      component={ResponseActionFormField}
      readDefaultValueOnForm={!props.item.isNew}
    />
  );
});
EndpointResponseAction.displayName = 'EndpointResponseAction';
