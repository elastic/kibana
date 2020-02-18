/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor, EuiTitle } from '@elastic/eui';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { RequirementsByServiceName, entries } from '../../../../../../common/types/epm';
import { ServiceTitleMap } from '../constants';
// import { useCore } from '../hooks/use_core';
import { Version } from './version';

export interface RequirementsProps {
  requirements: RequirementsByServiceName;
}

export function Requirements(props: RequirementsProps) {
  const { requirements } = props;
  // const { theme } = useCore();

  // const FlexGroup = styled(EuiFlexGroup)`
  //   padding: 0 0 ${theme.eui.paddingSizes.m} 0;
  //   margin: 0;
  // `;
  // XXX restore once theme is available
  const FlexGroup = styled(EuiFlexGroup)`
    padding: 0 0 0 0;
    margin: 0;
  `;
  // const StyledVersion = styled(Version)`
  //   font-size: ${theme.eui.euiFontSizeXS};
  // `;
  // XXX restore once theme is available
  const StyledVersion = styled(Version)`
    font-size: 1em;
  `;
  return (
    <Fragment>
      <FlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={'logoElasticStack'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle>
            <EuiText>
              <h4>Elastic Stack Compatibility</h4>
            </EuiText>
          </EuiTitle>
        </EuiFlexItem>
      </FlexGroup>
      {entries(requirements).map(([service, requirement]) => (
        <EuiFlexGroup key={service}>
          <EuiFlexItem grow={true}>
            <EuiTextColor color="subdued" key={service}>
              {ServiceTitleMap[service]}:
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StyledVersion version={requirement.versions} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </Fragment>
  );
}
