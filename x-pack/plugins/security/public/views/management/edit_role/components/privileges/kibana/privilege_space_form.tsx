/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiForm, EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { RoleValidator } from '../../../lib/validate_role';
import { FeatureTable } from './feature_table/feature_table';
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
  disabled?: boolean;
  intl: InjectedIntl;
  features: Feature[];
  role: Role;
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
      <EuiForm>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Spaces'} />
            </EuiText>
          }
        >
          <SpaceSelector
            spaces={availableSpaces}
            selectedSpaceIds={selectedSpaceIds}
            onChange={() => null}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Base privilege'} />
            </EuiText>
          }
        >
          <EuiSuperSelect
            disabled={this.props.disabled}
            onChange={() => null}
            options={[
              {
                value: NO_PRIVILEGE_VALUE,
                inputDisplay: <EuiText>None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>None</strong>
                    <p>Specify access to individual features</p>
                  </EuiText>
                ),
              },
              {
                value: 'read',
                inputDisplay: <EuiText>Read</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Read</strong>
                    <p>Grants read-only access to all features in selected spaces</p>
                  </EuiText>
                ),
              },
              {
                value: 'all',
                inputDisplay: <EuiText>All</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>All</strong>
                    <p>Grants full access to all features in selected spaces</p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={NO_PRIVILEGE_VALUE}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Feature privileges'} />
            </EuiText>
          }
        >
          <FeatureTable
            onChange={() => null}
            features={this.props.features}
            role={this.props.role}
            intl={this.props.intl}
          />
        </EuiFormRow>
      </EuiForm>
    );

    // return (
    //   <EuiFlexGroup responsive={false}>
    //     <EuiFlexItem>
    //       <EuiFormRow
    //         label={
    //           <FormattedMessage
    //             id="xpack.security.management.editRoles.privilegeSpaceForm.spacesFormRowLabel"
    //             defaultMessage="Spaces"
    //           />
    //         }
    //         {...validator.validateSelectedSpaces(selectedSpaceIds, selectedPrivilege)}
    //       >
    //         <SpaceSelector
    //           spaces={availableSpaces}
    //           selectedSpaceIds={selectedSpaceIds}
    //           onChange={this.onSelectedSpacesChange}
    //         />
    //       </EuiFormRow>
    //     </EuiFlexItem>
    //     <EuiFlexItem>
    //       <EuiFormRow
    //         label={
    //           <FormattedMessage
    //             id="xpack.security.management.editRoles.privilegeSpaceForm.privilegeFormRowLabel"
    //             defaultMessage="Privilege"
    //           />
    //         }
    //         {...validator.validateSelectedPrivilege(selectedSpaceIds, selectedPrivilege)}
    //       >
    //         <PrivilegeSelector
    //           data-test-subj={'space-form-priv-selector'}
    //           availablePrivileges={availablePrivileges}
    //           value={selectedPrivilege}
    //           onChange={this.onPrivilegeChange}
    //         />
    //       </EuiFormRow>
    //     </EuiFlexItem>
    //     <EuiFlexItem grow={false}>
    //       <EuiFormRow hasEmptyLabelSpace>
    //         <EuiButtonIcon
    //           aria-label={'Delete space privilege'}
    //           color={'danger'}
    //           onClick={this.props.onDelete}
    //           iconType={'trash'}
    //         />
    //       </EuiFormRow>
    //     </EuiFlexItem>
    //   </EuiFlexGroup>
    // );
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
