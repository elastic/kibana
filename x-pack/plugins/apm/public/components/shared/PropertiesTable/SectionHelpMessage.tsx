/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/Agent';
import { px, units } from '../../../style/variables';
import { getAgentDocUrlForProperty } from '../../../utils/documentation/agents';
import { PropertyKey } from './propertyConfig';

const EuiIconWithSpace = styled(EuiIcon)`
  margin-right: ${px(units.half)};
`;

function getSectionHelpText(propertyKey: PropertyKey) {
  switch (propertyKey) {
    case 'user':
      return i18n.translate(
        'xpack.apm.propertiesTable.userTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add contextual information about your users.'
        }
      );
    case 'labels':
      return i18n.translate(
        'xpack.apm.propertiesTable.labelsTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add filterable tags on transactions.'
        }
      );
    case 'transaction.custom':
    case 'error.custom':
      return i18n.translate(
        'xpack.apm.propertiesTable.customTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add custom contextual information on transactions.'
        }
      );
  }
}

export function SectionHelpMessage({
  propertyKey,
  agentName
}: {
  propertyKey?: PropertyKey;
  agentName?: AgentName;
}) {
  if (!propertyKey) {
    return null;
  }
  const docsUrl = getAgentDocUrlForProperty(propertyKey, agentName);
  if (!docsUrl) {
    return null;
  }

  return (
    <EuiText size="xs">
      <EuiIconWithSpace type="help" />
      {getSectionHelpText(propertyKey)}{' '}
      <EuiLink target="_blank" rel="noopener" href={docsUrl}>
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.learnMoreLinkLabel',
          {
            defaultMessage: 'Learn more in the documentation.'
          }
        )}
      </EuiLink>
    </EuiText>
  );
}
