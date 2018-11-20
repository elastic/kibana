/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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

export class PrivilegeCalloutWarning extends Component<Props, State> {
  public state = {
    showImpactedSpaces: false,
  };

  public render() {
    const { basePrivilege, isReservedRole } = this.props;

    let callout = null;

    if (basePrivilege === 'all') {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
<<<<<<< HEAD
            title={"Cannot customize a reserved role's space privileges"}
          >
            <p>
              This role always grants full access to all spaces. To customize privileges for
              individual spaces, you must create a new role.
=======
            title={
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.notPossibleToCustomizeReservedRoleSpacePrivilegesTitle"
                defaultMessage="Cannot customize a reserved role's space privileges"
              />
            }
          >
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.howToCustomizePrivilegesDescription"
                defaultMessage="This role always grants full access to all spaces. To customize privileges for
                individual spaces, you must create a new role."
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
<<<<<<< HEAD
            title={'Minimum privilege is too high to customize individual spaces'}
          >
            <p>
              Setting the minimum privilege to <strong>all</strong> grants full access to all
              spaces. To customize privileges for individual spaces, the minimum privilege must be
              either <strong>read</strong> or <strong>none</strong>.
=======
            title={
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.minimumPrivilegeTitle"
                defaultMessage="Minimum privilege is too high to customize individual spaces"
              />
            }
          >
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.howToCustomizePrivilegesForIndividualSpacesDescription"
                defaultMessage="Setting the minimum privilege to {allText} grants full access to all
                spaces. To customize privileges for individual spaces, the minimum privilege must be
                either {readText} or {noneText}."
                values={{
                  allText: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRoles.privilegeCalloutWarning.allText"
                        defaultMessage="all"
                      />
                    </strong>
                  ),
                  readText: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRoles.privilegeCalloutWarning.readText"
                        defaultMessage="read"
                      />
                    </strong>
                  ),
                  noneText: (
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRoles.privilegeCalloutWarning.noneText"
                        defaultMessage="none"
                      />
                    </strong>
                  ),
                }}
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
            title={"Cannot customize a reserved role's space privileges"}
          >
            <p>
              This role always grants read access to all spaces. To customize privileges for
              individual spaces, you must create a new role.
=======
            title={
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.notPossibleToCustomizeReservedRoleSpacePrivilegesTitle"
                defaultMessage="Cannot customize a reserved role's space privileges"
              />
            }
          >
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeCalloutWarning.alwaysGrantReadAccessToAllSpacesTitle"
                defaultMessage="This role always grants read access to all spaces. To customize privileges for
                individual spaces, you must create a new role."
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
                The minimal possible privilege is <strong>read</strong>.
=======
                <FormattedMessage
                  id="xpack.security.management.editRoles.privilegeCalloutWarning.minimalPossiblePrivilageTitle"
                  defaultMessage="The minimal possible privilege is {readText}."
                  values={{
                    readText: (
                      <strong>
                        <FormattedMessage
                          id="xpack.security.management.editRoles.privilegeCalloutWarning.readText"
                          defaultMessage="read"
                        />
                      </strong>
                    ),
                  }}
                />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
          title={"Cannot customize a reserved role's space privileges"}
        >
          <p>
            This role never grants access to any spaces within Kibana. To customize privileges for
            individual spaces, you must create a new role.
=======
          title={
            <FormattedMessage
              id="xpack.security.management.editRoles.privilegeCalloutWarning.notPossibleToCustomizeReservedRoleSpacePrivilegesTitle"
              defaultMessage="Cannot customize a reserved role's space privileges"
            />
          }
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.privilegeCalloutWarning.neverGrantReadAccessToAllSpacesTitle"
              defaultMessage="This role never grants access to any spaces within Kibana. To customize privileges for
              individual spaces, you must create a new role."
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          </p>
        </EuiCallOut>
      );
    }

    return callout;
  }
}
