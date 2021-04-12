/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { PackageInfo, ScreenshotItem } from '../../../../../types';

import { Screenshots } from './screenshots';
import { Readme } from './readme';
import { Details } from './details';

interface Props {
  packageInfo: PackageInfo;
}

const LeftColumn = styled(EuiFlexItem)`
  /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
  &&& {
    margin-top: 77px;
  }
`;

export const OverviewPage: React.FC<Props> = memo(({ packageInfo }: Props) => {
  // Collect all package-level and integration-level screenshots
  const allScreenshots = useMemo(
    () =>
      (packageInfo.policy_templates || []).reduce(
        (screenshots: ScreenshotItem[], policyTemplate) => {
          return [...screenshots, ...(policyTemplate.screenshots || [])];
        },
        [...(packageInfo.screenshots || [])]
      ),
    [packageInfo.policy_templates, packageInfo.screenshots]
  );

  return (
    <EuiFlexGroup alignItems="flexStart">
      <LeftColumn grow={2} />
      <EuiFlexItem grow={9} className="eui-textBreakWord">
        {packageInfo.readme ? (
          <Readme
            readmePath={packageInfo.readme}
            packageName={packageInfo.name}
            version={packageInfo.version}
          />
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
          {allScreenshots.length ? (
            <EuiFlexItem>
              <Screenshots
                images={allScreenshots}
                packageName={packageInfo.name}
                version={packageInfo.version}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <Details packageInfo={packageInfo} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
