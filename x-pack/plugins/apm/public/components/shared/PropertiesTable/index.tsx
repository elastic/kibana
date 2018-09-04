/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { colors, fontSize, px, unit, units } from '../../../style/variables';
import { getFeatureDocs } from '../../../utils/documentation';
// @ts-ignore
import { ExternalLink } from '../../../utils/url';
import { NestedKeyValueTable } from './NestedKeyValueTable';
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

export function getPropertyTabNames(selected: string[]): string[] {
  return PROPERTY_CONFIG.filter(
    ({ key, required }: { key: string; required: boolean }) =>
      required || selected.includes(key)
  ).map(({ key }: { key: string }) => key);
}

export function AgentFeatureTipMessage({
  featureName,
  agentName
}: {
  featureName: string;
  agentName: string;
}): JSX.Element | null {
  const docs = getFeatureDocs(featureName, agentName);

  if (!docs) {
    return null;
  }

  return (
    <TableInfo>
      <EuiIcon type="iInCircle" />
      {docs.text}{' '}
      {docs.url && (
        <ExternalLink href={docs.url}>
          Learn more in the documentation.
        </ExternalLink>
      )}
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
  agentName: string;
}) {
  if (_.isEmpty(propData)) {
    return (
      <TableContainer>
        <TableInfo>
          <EuiIcon type="iInCircle" /> No data available
        </TableInfo>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <NestedKeyValueTable
        data={propData}
        parentKey={propKey}
        keySorter={sortKeysByConfig}
        depth={1}
      />
      <AgentFeatureTipMessage
        featureName={`context-${propKey}`}
        agentName={agentName}
      />
    </TableContainer>
  );
}
