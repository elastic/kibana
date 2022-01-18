/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiCard,
  EuiFlexItem,
  EuiFlexGrid,
  EuiText,
  EuiButtonGroup,
  EuiIcon,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { data } from './mock';

export function ServiceGroups() {
  const [toggleIdSelected, setToggleIdSelected] = useState(`grid`);

  const isGrid = toggleIdSelected === 'grid';

  return (
    <>
      <EuiButtonGroup
        legend="This is a basic group"
        options={[
          { id: `grid`, label: <EuiIcon type="grid" /> },
          { id: `list`, label: <EuiIcon type="list" /> },
        ]}
        idSelected={toggleIdSelected}
        onChange={(id) => setToggleIdSelected(id)}
      />
      <EuiFlexGrid columns={isGrid ? undefined : 1}>
        {data.map((item) => {
          return (
            <EuiFlexItem key={item.name}>
              {/* @ts-ignore */}
              <EuiCard
                style={isGrid ? { width: 286, height: 186 } : undefined}
                layout={isGrid ? 'vertical' : 'horizontal'}
                icon={
                  <EuiAvatar name={item.name} color={item.color} size="l" />
                }
                title={item.name}
                description={
                  <EuiFlexGroup
                    direction={isGrid ? 'column' : 'row'}
                    gutterSize="m"
                  >
                    <EuiFlexItem>
                      <EuiText size="s">{item.description}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem
                      style={isGrid ? undefined : { textAlign: 'end' }}
                    >
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
                }
                onClick={() => {}}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </>
  );
}
