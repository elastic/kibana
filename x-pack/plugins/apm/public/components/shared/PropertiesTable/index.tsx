/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get, indexBy, uniq } from 'lodash';
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
import { KeySorter, NestedKeyValueTable } from './NestedKeyValueTable';
import { PROPERTY_CONFIG } from './propertyConfig';

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

export interface Tab {
  key: string;
  label: string;
}

export function getPropertyTabNames(selected: string[]): Tab[] {
  return PROPERTY_CONFIG.filter(
    ({ key, required }) => required || selected.includes(key)
  ).map(({ key, label }) => ({ key, label }));
}

function getAgentFeatureText(featureName: string) {
  switch (featureName) {
    case 'user':
      return i18n.translate(
        'xpack.apm.propertiesTable.userTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add contextual information about your users.'
        }
      );
    case 'tags':
      return i18n.translate(
        'xpack.apm.propertiesTable.tagsTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add filterable tags on transactions.'
        }
      );
    case 'custom':
      return i18n.translate(
        'xpack.apm.propertiesTable.customTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add custom contextual information on transactions.'
        }
      );
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
      <EuiLink target="_blank" rel="noopener noreferrer" href={docsUrl}>
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.learnMoreLinkLabel',
          { defaultMessage: 'Learn more in the documentation.' }
        )}
      </EuiLink>
    </TableInfo>
  );
}

export const sortKeysByConfig: KeySorter = (object, currentKey) => {
  const indexedPropertyConfig = indexBy(PROPERTY_CONFIG, 'key');
  const presorted = get(
    indexedPropertyConfig,
    `${currentKey}.presortedKeys`,
    []
  );
  return uniq([...presorted, ...Object.keys(object).sort()]);
};

export function PropertiesTable({
  propData,
  propKey,
  agentName
}: {
  propData?: StringMap<any>;
  propKey: string;
  agentName?: string;
}) {
  return (
    <TableContainer>
      {propData ? (
        <NestedKeyValueTable
          data={propData}
          parentKey={propKey}
          keySorter={sortKeysByConfig}
          depth={1}
        />
      ) : (
        <TableInfoHeader>
          {i18n.translate(
            'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
            { defaultMessage: 'No data available' }
          )}
        </TableInfoHeader>
      )}
      <AgentFeatureTipMessage featureName={propKey} agentName={agentName} />
    </TableContainer>
  );
}
