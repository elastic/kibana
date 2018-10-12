/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

interface Props {
  basePrivilege: KibanaPrivilege;
  isReservedRole: boolean;
}

interface State {
  showImpactedSpaces: boolean;
}

export class PrivilegeCalloutWarningUI extends Component<Props, State> {
  public state = {
    showImpactedSpaces: false,
  };

  public render() {
    const { basePrivilege, isReservedRole, intl } = this.props;

    let callout = null;

    if (basePrivilege === 'all') {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={intl.formatMessage({
              id:
                'xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.cannotCustomizeOneTitle',
              defaultMessage: "Cannot customize a reserved role's space privileges",
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.roleTitle"
                defaultMessage="This role always grants full access to all spaces. To customize privileges for
                individual spaces, you must create a new role."
              />
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={intl.formatMessage({
              id:
                'xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minimumPrivilegeTitle',
              defaultMessage: 'Minimum privilege is too high to customize individual spaces',
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.settingsMinimumTitle"
                defaultMessage="Setting the minimum privilege to {firstStrong} grants full access to all
                spaces. To customize privileges for individual spaces, the minimum privilege must be
                either {secondStrong} or {thirdStrong}."
                values={{
                  firstStrong: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minAllTitle"
                        defaultMessage="all"
                      />
                    </strong>
                  ),
                  secondStrong: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minReadTitle"
                        defaultMessage="read"
                      />
                    </strong>
                  ),
                  thirdStrong: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minNoneTitle"
                        defaultMessage="none"
                      />
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiCallOut>
        );
      }
    }

    if (basePrivilege === 'read') {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={intl.formatMessage({
              id:
                'xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.cannotCustomizeTwoTitle',
              defaultMessage: "Cannot customize a reserved role's space privileges",
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.alwaysGrantReadRoleTitle"
                defaultMessage="This role always grants read access to all spaces. To customize privileges for
                individual spaces, you must create a new role."
              />
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={
              <span>
                <FormattedMessage
                  id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minimalPossiblePrivilageTitle"
                  defaultMessage="The minimal possible privilege is {message}."
                  values={{
                    message: (
                      <strong>
                        <FormattedMessage
                          id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.minPossibleReadTitle"
                          defaultMessage="read"
                        />
                      </strong>
                    ),
                  }}
                />
              </span>
            }
          />
        );
      }
    }

    if (basePrivilege === NO_PRIVILEGE_VALUE && isReservedRole) {
      callout = (
        <EuiCallOut
          color="warning"
          iconType="iInCircle"
          title={intl.formatMessage({
            id:
              'xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.cannotCustomizeThreeTitle',
            defaultMessage: "Cannot customize a reserved role's space privileges",
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.privileges.kibana.privilegeCalloutWarning.roleNeverAccessTitle"
              defaultMessage="This role never grants access to any spaces within Kibana. To customize privileges for
              individual spaces, you must create a new role."
            />
          </p>
        </EuiCallOut>
      );
    }

    return callout;
  }
}

export const PrivilegeCalloutWarning = injectI18n(PrivilegeCalloutWarningUI);
