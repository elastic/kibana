/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import {
  AssetsGroupedByServiceByType,
  AssetTypeToParts,
  KibanaAssetType,
  entries,
} from '../../../types';
import {
  AssetIcons,
  AssetTitleMap,
  DisplayedAssets,
  ServiceIcons,
  ServiceTitleMap,
} from '../constants';

const FirstHeaderRow = styled(EuiFlexGroup)`
  padding: 0 0 ${(props) => props.theme.eui.paddingSizes.m} 0;
`;

const HeaderRow = styled(EuiFlexGroup)`
  padding: ${(props) => props.theme.eui.paddingSizes.m} 0;
`;

const FacetGroup = styled(EuiFacetGroup)`
  flex-grow: 0;
`;

const FacetButton = styled(EuiFacetButton)`
  padding: '${(props) => props.theme.eui.paddingSizes.xs} 0';
  height: 'unset';
`;

export function AssetsFacetGroup({ assets }: { assets: AssetsGroupedByServiceByType }) {
  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], index) => {
        const Header = index === 0 ? FirstHeaderRow : HeaderRow;
        // filter out assets we are not going to display
        const filteredTypes: AssetTypeToParts = entries(typeToParts).reduce(
          (acc: any, [asset, value]) => {
            if (DisplayedAssets[service].includes(asset)) acc[asset] = value;
            return acc;
          },
          {}
        );
        return (
          <Fragment key={service}>
            <Header gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={ServiceIcons[service]} />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle key={service} size="xs">
                  <EuiText>
                    <h4>{ServiceTitleMap[service]} Assets</h4>
                  </EuiText>
                </EuiTitle>
              </EuiFlexItem>
            </Header>

            <FacetGroup>
              {entries(filteredTypes).map(([_type, parts]) => {
                const type = _type as KibanaAssetType;
                // only kibana assets have icons
                const iconType = type in AssetIcons && AssetIcons[type];
                const iconNode = iconType ? <EuiIcon type={iconType} size="s" /> : '';
                return (
                  <FacetButton
                    key={type}
                    quantity={parts.length}
                    icon={iconNode}
                    // https://github.com/elastic/eui/issues/2216
                    buttonRef={() => {}}
                  >
                    <EuiTextColor color="subdued">{AssetTitleMap[type]}</EuiTextColor>
                  </FacetButton>
                );
              })}
            </FacetGroup>
          </Fragment>
        );
      })}
    </Fragment>
  );
}
