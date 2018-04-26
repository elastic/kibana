/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { KuiTableInfo } from '@kbn/ui-framework/components';
import _ from 'lodash';
import STATIC_PROPS from './staticProperties.json';
import {
  units,
  colors,
  px,
  fontFamilyCode,
  fontSizes,
  unit,
  fontSize
} from '../../../style/variables';
import { EuiIcon } from '@elastic/eui';

import { getFeatureDocs } from '../../../utils/documentation';
import { ExternalLink } from '../../../utils/url';

const TableContainer = styled.div`
  padding-bottom: ${px(units.double)};
`;

const Table = styled.table`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.small};
  width: 100%;
`;

const Row = styled.tr`
  border-bottom: 1px solid ${colors.gray4};
  &:last-child {
    border: 0;
  }
`;

const Cell = styled.td`
  vertical-align: top;
  padding: ${units.half}px 0;

  ${Row}:first-child> & {
    padding-top: 0;
  }

  ${Row}:last-child> & {
    padding-bottom: 0;
  }

  &:first-child {
    width: 300px;
    font-weight: bold;
  }
`;

const TableInfo = styled(KuiTableInfo)`
  padding: ${px(unit)} 0 0;
  text-align: center;
  font-size: ${fontSize};
`;

const EmptyValue = styled.span`
  color: ${colors.gray3};
`;

function getSortedProps(propData, levelTwoKey, level) {
  if (level === 2) {
    return getLevelTwoProps(propData, levelTwoKey);
  }

  return _.sortBy(_.map(propData, (value, key) => ({ value, key })), 'key');
}

function formatValue(value) {
  if (_.isObject(value)) {
    return <pre>{JSON.stringify(value, null, 4)}</pre>;
  } else if (_.isBoolean(value) || _.isNumber(value)) {
    return String(value);
  } else if (!value) {
    return <EmptyValue>N/A</EmptyValue>;
  }

  return value;
}

function formatKey(key, value) {
  if (value == null) {
    return <EmptyValue>{key}</EmptyValue>;
  }

  return key;
}

export function getLevelOneProps(dynamicProps) {
  return STATIC_PROPS.filter(
    ({ key, required }) => required || dynamicProps.includes(key)
  ).map(({ key }) => key);
}

function getLevelTwoProps(dynamicProps, currentKey) {
  const staticProps = _.get(
    _.find(STATIC_PROPS, { key: currentKey }),
    'children'
  );
  const dynamicPropsSorted = Object.keys(dynamicProps).sort();
  return _.uniq([...staticProps, ...dynamicPropsSorted]).map(key => ({
    key,
    value: dynamicProps[key]
  }));
}

function recursiveSort(propData, levelTwoKey, level) {
  return (
    <Table>
      <tbody>
        {getSortedProps(propData, levelTwoKey, level).map(({ key, value }) => {
          return (
            <Row key={key}>
              <Cell>{formatKey(key, value)}</Cell>
              <Cell>
                {level < 3 && _.isObject(value)
                  ? recursiveSort(value, levelTwoKey, level + 1)
                  : formatValue(value)}
              </Cell>
            </Row>
          );
        })}
      </tbody>
    </Table>
  );
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

export function PropertiesTable({ propData = {}, propKey, agentName }) {
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
      {recursiveSort(propData, propKey, 2, agentName)}
      <AgentFeatureTipMessage
        featureName={`context-${propKey}`}
        agentName={agentName}
      />
    </TableContainer>
  );
}
