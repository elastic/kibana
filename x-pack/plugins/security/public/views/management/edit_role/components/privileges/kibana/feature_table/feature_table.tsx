/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiIcon, EuiInMemoryTable, EuiSuperSelect, EuiText, IconType } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';

interface Props {
  role: Partial<Role>;
  features: Feature[];
  intl: InjectedIntl;
  onChange: (role: Partial<Role>) => void;
}

export class FeatureTable extends Component<Props, {}> {
  public render() {
    const { role, features } = this.props;

    const items = features.map(feature => ({
      feature,
      role,
    }));

    return <EuiInMemoryTable columns={this.getColumns()} items={items} />;
  }

  public onChange = (featureId: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const updatedRole: Partial<Role> = {
      ...this.props.role,
    };

    // TODO

    this.props.onChange(updatedRole);
  };

  private getColumns = () => [
    {
      field: 'feature',
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesFeatureColumnTitle',
        defaultMessage: 'Feature',
      }),
      render: (feature: Feature) => {
        return (
          <EuiText>
            <EuiIcon type={feature.icon as IconType} />
            &ensp; {feature.name}
          </EuiText>
        );
      },
    },
    {
      field: 'role',
      align: 'right',
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesEnabledColumnTitle',
        defaultMessage: 'Privilege',
      }),
      render: (roleEntry: Role, record: Record<string, any>) => {
        return (
          <EuiSuperSelect
            compressed
            options={[
              {
                value: 'none',
                inputDisplay: <EuiText>None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>None</strong>
                  </EuiText>
                ),
              },
              {
                value: 'read',
                inputDisplay: <EuiText>Read</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Read</strong>
                    <p>Grants read-only access to {record.feature.name}</p>
                  </EuiText>
                ),
              },
              {
                value: 'all',
                inputDisplay: <EuiText>All</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>All</strong>
                    <p>Grants full access to {record.feature.name}</p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={'none'}
          />
        );
      },
    },
  ];
}
