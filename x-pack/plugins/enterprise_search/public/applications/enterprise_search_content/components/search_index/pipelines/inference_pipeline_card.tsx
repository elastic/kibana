/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferencePipeline } from '../../../../../../common/types/pipelines';
import { HttpLogic } from '../../../../shared/http';

export const InferencePipelineCard: React.FC<InferencePipeline> = ({
  pipelineName,
  trainedModelName,
  isDeployed,
  modelType,
}) => {
  const { http } = useValues(HttpLogic);
  const [isPopOverOpen, setIsPopOverOpen] = useState(false);

  const deployedText = i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.isDeployed', {
    defaultMessage: 'Deployed',
  });

  const notDeployedText = i18n.translate(
    'xpack.enterpriseSearch.inferencePipelineCard.isNotDeployed',
    { defaultMessage: 'Not deployed' }
  );

  const actionButton = (
    <EuiButtonEmpty
      iconSide="right"
      flush="both"
      iconType="boxesVertical"
      onClick={() => setIsPopOverOpen(!isPopOverOpen)}
    >
      {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.actionButton', {
        defaultMessage: 'Actions',
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>{pipelineName}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={actionButton}
                isOpen={isPopOverOpen}
                closePopover={() => setIsPopOverOpen(false)}
              >
                <EuiPopoverTitle paddingSize="m">
                  {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.action.title', {
                    defaultMessage: 'Actions',
                  })}
                </EuiPopoverTitle>
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem>
                    <div>
                      <EuiButtonEmpty
                        size="s"
                        flush="both"
                        iconType="eye"
                        color="text"
                        href={http.basePath.prepend(
                          `/app/management/ingest/ingest_pipelines/?pipeline=${pipelineName}`
                        )}
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.inferencePipelineCard.action.view',
                          { defaultMessage: 'View in Stack Management' }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <div>
                      <EuiButtonEmpty size="s" flush="both" iconType="trash" color="text">
                        {i18n.translate(
                          'xpack.enterpriseSearch.inferencePipelineCard.action.delete',
                          { defaultMessage: 'Delete pipeline' }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTextColor color="subdued">{trainedModelName}</EuiTextColor>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiHealth color={isDeployed ? 'success' : 'accent'}>
                    {isDeployed ? deployedText : notDeployedText}
                  </EuiHealth>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <EuiBadge color="hollow">{modelType}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
