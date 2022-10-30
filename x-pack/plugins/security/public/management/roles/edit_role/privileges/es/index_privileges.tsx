/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SecurityLicense } from '../../../../../../common/licensing';
import type { Role, RoleIndexPrivilege } from '../../../../../../common/model';
import { isRoleEnabled, isRoleReadOnly } from '../../../../../../common/model';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';

interface Props {
  role: Role;
  indexPatterns: string[];
  availableIndexPrivileges: string[];
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  license: SecurityLicense;
  onChange: (role: Role) => void;
  validator: RoleValidator;
  editable?: boolean;
}

interface State {
  availableFields: {
    [indexPrivKey: string]: string[];
  };
}

export class IndexPrivileges extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    editable: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      availableFields: {},
    };
  }

  public render() {
    const { indices = [] } = this.props.role.elasticsearch;

    const { indexPatterns, license, availableIndexPrivileges, indicesAPIClient } = this.props;
    const { allowRoleDocumentLevelSecurity, allowRoleFieldLevelSecurity } = license.getFeatures();

    const props = {
      indexPatterns,
      indicesAPIClient,
      // If editing an existing role while that has been disabled, always show the FLS/DLS fields because currently
      // a role is only marked as disabled if it has FLS/DLS setup (usually before the user changed to a license that
      // doesn't permit FLS/DLS).
      allowDocumentLevelSecurity: allowRoleDocumentLevelSecurity || !isRoleEnabled(this.props.role),
      allowFieldLevelSecurity: allowRoleFieldLevelSecurity || !isRoleEnabled(this.props.role),
      isRoleReadOnly: !this.props.editable || isRoleReadOnly(this.props.role),
    };

    const forms = indices.map((indexPrivilege: RoleIndexPrivilege, idx) => (
      <IndexPrivilegeForm
        key={idx}
        {...props}
        formIndex={idx}
        validator={this.props.validator}
        availableIndexPrivileges={availableIndexPrivileges}
        indexPrivilege={indexPrivilege}
        onChange={this.onIndexPrivilegeChange(idx)}
        onDelete={this.onIndexPrivilegeDelete(idx)}
      />
    ));

    return <Fragment>{forms}</Fragment>;
  }

  public addIndexPrivilege = () => {
    const { role } = this.props;

    const newIndices = [
      ...role.elasticsearch.indices,
      {
        names: [],
        privileges: [],
        field_security: {
          grant: ['*'],
        },
      },
    ];

    this.props.onChange({
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        indices: newIndices,
      },
    });
  };

  public onIndexPrivilegeChange = (privilegeIndex: number) => {
    return (updatedPrivilege: RoleIndexPrivilege) => {
      const { role } = this.props;
      const { indices } = role.elasticsearch;

      const newIndices = [...indices];
      newIndices[privilegeIndex] = updatedPrivilege;

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          indices: newIndices,
        },
      });
    };
  };

  public onIndexPrivilegeDelete = (privilegeIndex: number) => {
    return () => {
      const { role } = this.props;

      const newIndices = [...role.elasticsearch.indices];
      newIndices.splice(privilegeIndex, 1);

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          indices: newIndices,
        },
      });
    };
  };

  public isPlaceholderPrivilege = (indexPrivilege: RoleIndexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };
}
