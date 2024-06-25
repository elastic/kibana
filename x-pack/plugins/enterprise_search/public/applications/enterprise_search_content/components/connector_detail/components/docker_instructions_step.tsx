/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiAccordion,
  EuiAccordionProps,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { CodeBox } from '@kbn/search-api-panels';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';

import { getRunFromDockerSnippet } from '../../search_index/connector/constants';

export interface DockerInstructionsStepProps {
  connectorId: string;
  hasApiKey: boolean;
  isWaitingForConnector: boolean;
  serviceType: string;
}
export const DockerInstructionsStep: React.FC<DockerInstructionsStepProps> = ({
  connectorId,
  hasApiKey,
  isWaitingForConnector,
  serviceType,
}) => {
  const [isOpen, setIsOpen] = React.useState<EuiAccordionProps['forceState']>('open');
  const { elasticsearchUrl } = useCloudDetails();

  useEffect(() => {
    if (!isWaitingForConnector) {
      setIsOpen('closed');
    }
  }, [isWaitingForConnector]);

  return (
    <EuiAccordion
      id="collapsibleDocker"
      onToggle={() => setIsOpen(isOpen === 'closed' ? 'open' : 'closed')}
      forceState={isOpen}
      buttonContent={
        <EuiText size="m">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.runTheFollowingCommandLabel',
              {
                defaultMessage:
                  'Run the following command in your terminal. Make sure you have Docker installed on your machine',
              }
            )}
          </p>
        </EuiText>
      }
    >
      <EuiSpacer size="s" />
      {hasApiKey ? (
        <CodeBox
          languageType="yaml"
          codeSnippet={getRunFromDockerSnippet({
            connectorId: connectorId ?? '',
            elasticsearchHost: elasticsearchUrl ?? 'http://localhost:9200',
            serviceType: serviceType ?? '',
          })}
        />
      ) : (
        <EuiSkeletonRectangle width="100%" height={148} />
      )}
    </EuiAccordion>
  );
};
