/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import PROP_CONFIG, { indexedPropertyConfig } from './propertyConfig';
import { colors, units, px, unit, fontSize } from '../../../style/variables';
import { EuiIcon } from '@elastic/eui';

import { getFeatureDocs } from '../../../utils/documentation';
import { ExternalLink } from '../../../utils/url';
import { NestedKeyValueTable } from './NestedKeyValueTable';

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

export function getLevelOneProps(dynamicProps) {
  return PROP_CONFIG.filter(
    ({ key, required }) => required || dynamicProps.includes(key)
  ).map(({ key }) => key);
}

function AgentFeatureTipMessage({ featureName, agentName }) {
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

function sortKeysByConfig(object, currentKey) {
  const presorted = _.get(
    indexedPropertyConfig,
    `${currentKey}.presortedKeys`,
    []
  );
  return _.uniq([...presorted, ...Object.keys(object).sort()]);
}

// TODO: if propData defaults to an empty object, the if (!propData)
// will never be truthy unless propData is explicitly null or false...
export function PropertiesTable({ propData, propKey, agentName }) {
  if (!propData) {
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
