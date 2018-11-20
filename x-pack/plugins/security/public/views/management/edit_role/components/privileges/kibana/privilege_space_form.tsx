/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { RoleValidator } from '../../../lib/validate_role';
import { PrivilegeSelector } from './privilege_selector';
import { SpaceSelector } from './space_selector';

interface Props {
  availableSpaces: Space[];
  selectedSpaceIds: string[];
  availablePrivileges: KibanaPrivilege[];
  selectedPrivilege: KibanaPrivilege | null;
  onChange: (
    params: {
      spaces: string[];
      privilege: KibanaPrivilege | null;
    }
  ) => void;
  onDelete: () => void;
  validator: RoleValidator;
}

export class PrivilegeSpaceForm extends Component<Props, {}> {
  public render() {
    const {
      availableSpaces,
      selectedSpaceIds,
      availablePrivileges,
      selectedPrivilege,
      validator,
    } = this.props;

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiFormRow
<<<<<<< HEAD
            label={'Spaces'}
=======
            label={
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeSpaceForm.spacesFormRowLabel"
                defaultMessage="Spaces"
              />
            }
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            {...validator.validateSelectedSpaces(selectedSpaceIds, selectedPrivilege)}
          >
            <SpaceSelector
              spaces={availableSpaces}
              selectedSpaceIds={selectedSpaceIds}
              onChange={this.onSelectedSpacesChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
<<<<<<< HEAD
            label={'Privilege'}
=======
            label={
              <FormattedMessage
                id="xpack.security.management.editRoles.privilegeSpaceForm.privilegeFormRowLabel"
                defaultMessage="Privilege"
              />
            }
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            {...validator.validateSelectedPrivilege(selectedSpaceIds, selectedPrivilege)}
          >
            <PrivilegeSelector
              data-test-subj={'space-form-priv-selector'}
              availablePrivileges={availablePrivileges}
              value={selectedPrivilege}
              onChange={this.onPrivilegeChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButtonIcon
              aria-label={'Delete space privilege'}
              color={'danger'}
              onClick={this.props.onDelete}
              iconType={'trash'}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  public onSelectedSpacesChange = (selectedSpaceIds: string[]) => {
    this.props.onChange({
      spaces: selectedSpaceIds,
      privilege: this.props.selectedPrivilege,
    });
  };

  public onPrivilegeChange = (privilege: KibanaPrivilege) => {
    this.props.onChange({
      spaces: this.props.selectedSpaceIds,
      privilege,
    });
  };
}
