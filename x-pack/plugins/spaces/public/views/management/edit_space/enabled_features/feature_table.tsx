/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiCheckbox, EuiIcon, EuiInMemoryTable, EuiSwitch, EuiText, IconType } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import { Feature } from 'x-pack/plugins/xpack_main/types';

interface Props {
  space: Partial<Space>;
  features: Feature[];
  intl: InjectedIntl;
  onChange: (space: Partial<Space>) => void;
}

export class FeatureTable extends Component<Props, {}> {
  public render() {
    const { space, features } = this.props;

    const items = features.map(feature => ({
      feature,
      space,
    }));

    return <EuiInMemoryTable columns={this.getColumns()} items={items} />;
  }

  public onChange = (featureId: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const updatedSpace: Partial<Space> = {
      ...this.props.space,
    };

    let disabledFeatures = updatedSpace.disabledFeatures || [];

    const isFeatureEnabled = (e.target as Record<string, any>).checked;
    if (isFeatureEnabled) {
      disabledFeatures = disabledFeatures.filter(feature => feature !== featureId);
    } else {
      disabledFeatures = _.uniq([...disabledFeatures, featureId]);
    }

    updatedSpace.disabledFeatures = disabledFeatures;
    this.props.onChange(updatedSpace);
  };

  private getColumns = () => [
    {
      field: 'feature',
      name: this.props.intl.formatMessage({
        id: 'xpack.spaces.management.enabledSpaceFeaturesFeatureColumnTitle',
        defaultMessage: 'Feature',
      }),
      render: (feature: Feature) => {
        return (
          <EuiText>
            <EuiIcon size="m" type={feature.icon as IconType} />
            &ensp; {feature.name}
          </EuiText>
        );
      },
    },
    {
      field: 'space',
      width: '80',
      align: 'right',
      name: this.props.intl.formatMessage({
        id: 'xpack.spaces.management.enabledSpaceFeaturesEnabledColumnTitle',
        defaultMessage: 'Show?',
      }),
      render: (spaceEntry: Space, record: Record<string, any>) => {
        const checked = !(
          spaceEntry.disabledFeatures && spaceEntry.disabledFeatures.includes(record.feature.id)
        );

        return (
          <EuiSwitch
            id={record.feature.id}
            checked={checked}
            onChange={this.onChange(record.feature.id) as any}
            aria-label={
              checked ? `${record.feature.name} visible` : `${record.feature.name} disabled`
            }
          />
        );
      },
    },
  ];
}
