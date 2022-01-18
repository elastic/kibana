/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceGroupsOrientation } from './';
import { data as MockData } from './mock';

type DataMockType = typeof MockData;

interface Props {
  orientation: ServiceGroupsOrientation;
  items: DataMockType;
}

export function ServiceGroupsList({ orientation, items }: Props) {
  const isGrid = orientation === 'grid';
  return (
    <EuiFlexGrid columns={isGrid ? undefined : 1} gutterSize="m">
      {items.map((item) => {
        const cardProps = {
          style: isGrid ? { width: 286, height: 186 } : undefined,
          icon: <EuiAvatar name={item.name} color={item.color} size="l" />,
          title: item.name,
          description: (
            <EuiFlexGroup direction={isGrid ? 'column' : 'row'} gutterSize="m">
              <EuiFlexItem>
                <EuiText size="s">
                  {item.description ||
                    i18n.translate(
                      'xpack.apm.serviceGroups.cardsList.emptyDescription',
                      { defaultMessage: 'No description available' }
                    )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem style={isGrid ? undefined : { textAlign: 'end' }}>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.apm.serviceGroups.cardsList.serviceCount',
                    {
                      defaultMessage:
                        '{servicesCount} {servicesCount, plural, one {service} other {services}}',
                      values: { servicesCount: item.totalServices },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          onClick: () => {},
        };

        return (
          <EuiFlexItem key={item.name}>
            {/* This needs to be done like this, because of the way EUi defined the layout property */}
            {isGrid ? (
              <EuiCard layout="vertical" {...cardProps} />
            ) : (
              <EuiCard layout="horizontal" {...cardProps} />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
}
