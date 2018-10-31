/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { StringMap } from '../../../../typings/common';
import {
  colors,
  fontSize,
  fontSizes,
  px,
  unit,
  units
} from '../../../style/variables';
import { getAgentFeatureDocsUrl } from '../../../utils/documentation/agents';
// @ts-ignore
import { ExternalLink } from '../../../utils/url';
import { KeySorter, NestedKeyValueTable } from './NestedKeyValueTable';
import PROPERTY_CONFIG from './propertyConfig.json';

const indexedPropertyConfig = _.indexBy(PROPERTY_CONFIG, 'key');

const TableContainer = styled.div`
  padding-bottom: ${px(units.double)};
`;

const TableInfo = styled.div`
  padding: ${px(unit)} 0 0;
  text-align: center;
  font-size: ${fontSize};
  color: ${colors.gray2};
  line-height: 1.5;
`;

const TableInfoHeader = styled(TableInfo)`
  font-size: ${fontSizes.large};
  color: ${colors.black2};
`;

const EuiIconWithSpace = styled(EuiIcon)`
  margin-right: ${px(units.half)};
`;

export function getPropertyTabNames(selected: string[]): string[] {
  return PROPERTY_CONFIG.filter(
    ({ key, required }: { key: string; required: boolean }) =>
      required || selected.includes(key)
  ).map(({ key }: { key: string }) => key);
}

function getAgentFeatureText(featureName: string) {
  switch (featureName) {
    case 'user':
      return 'You can configure your agent to add contextual information about your users.';
    case 'tags':
      return 'You can configure your agent to add filterable tags on transactions.';
    case 'custom':
      return 'You can configure your agent to add custom contextual information on transactions.';
  }
}

export function AgentFeatureTipMessage({
  featureName,
  agentName
}: {
  featureName: string;
  agentName?: string;
}) {
  const docsUrl = getAgentFeatureDocsUrl(featureName, agentName);
  if (!docsUrl) {
    return null;
  }

  return (
    <TableInfo>
      <EuiIconWithSpace type="iInCircle" />
      {getAgentFeatureText(featureName)}{' '}
      <ExternalLink href={docsUrl}>
        Learn more in the documentation.
      </ExternalLink>
    </TableInfo>
  );
}

export const sortKeysByConfig: KeySorter = (object, currentKey) => {
  const presorted = _.get(
    indexedPropertyConfig,
    `${currentKey}.presortedKeys`,
    []
  );
  return _.uniq([...presorted, ...Object.keys(object).sort()]);
};

export function PropertiesTable({
  propData,
  propKey,
  agentName
}: {
  propData: StringMap<any>;
  propKey: string;
  agentName?: string;
}) {
  const hasPropData = !_.isEmpty(propData);

  return (
    <TableContainer>
      {hasPropData ? (
        <NestedKeyValueTable
          data={propData}
          parentKey={propKey}
          keySorter={sortKeysByConfig}
          depth={1}
        />
      ) : (
        <TableInfoHeader>No data available</TableInfoHeader>
      )}
      <AgentFeatureTipMessage featureName={propKey} agentName={agentName} />
    </TableContainer>
  );
}
