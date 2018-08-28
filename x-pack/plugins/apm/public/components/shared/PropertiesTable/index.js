/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import { PROPERTY_CONFIG } from './propertyConfig';
import { colors, units, px, unit, fontSize } from '../../../style/variables';
import { EuiIcon } from '@elastic/eui';

import { getFeatureDocs } from '../../../utils/documentation';
import { ExternalLink } from '../../../utils/url';
import { NestedKeyValueTable } from './NestedKeyValueTable';

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

export function getLevelOneProps(selected) {
  return PROPERTY_CONFIG.filter(
    ({ key, required }) => required || selected.includes(key)
  ).map(({ key }) => key);
}

export function AgentFeatureTipMessage({ featureName, agentName }) {
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

export function sortKeysByConfig(object, currentKey) {
  const presorted = _.get(
    indexedPropertyConfig,
    `${currentKey}.presortedKeys`,
    []
  );
  return _.uniq([...presorted, ...Object.keys(object).sort()]);
}

export function PropertiesTable({ propData, propKey, agentName }) {
  if (!propData || Object.keys(propData).length === 0) {
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
