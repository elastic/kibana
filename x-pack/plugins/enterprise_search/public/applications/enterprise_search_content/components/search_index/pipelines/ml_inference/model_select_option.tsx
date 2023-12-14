/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiTextTruncate,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlModel } from '../../../../../../../common/types/ml';
import { TrainedModelHealth } from '../ml_model_health';

export type ModelSelectOptionProps = MlModel & {
  label: string;
  checked?: 'on';
};

export interface LicenseBadgeProps {
  licenseType: string;
  modelDetailsPageUrl?: string;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ licenseType, modelDetailsPageUrl }) => {
  const licenseLabel = i18n.translate(
    'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.licenseBadge.label',
    {
      defaultMessage: 'License: {licenseType}',
      values: {
        licenseType,
      },
    }
  );

  return (
    <EuiBadge color="hollow">
      {modelDetailsPageUrl ? (
        <EuiLink target="_blank" href={modelDetailsPageUrl}>
          {licenseLabel}
        </EuiLink>
      ) : (
        <p>{licenseLabel}</p>
      )}
    </EuiBadge>
  );
};

export const ModelSelectOption: React.FC<ModelSelectOptionProps> = ({
  modelId,
  title,
  description,
  isPlaceholder,
  licenseType,
  modelDetailsPageUrl,
  deploymentState,
  deploymentStateReason,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize={useIsWithinMaxBreakpoint('s') ? 'xs' : 'l'}>
      <EuiFlexItem style={{ overflow: 'hidden' }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                <EuiTextTruncate text={title} />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">
              <EuiTextTruncate text={modelId} />
            </EuiTextColor>
          </EuiFlexItem>
          {(licenseType || description) && (
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {licenseType && (
                  <EuiFlexItem grow={false}>
                    {/* Wrap in a div to prevent the badge from growing to a whole row on mobile */}
                    <div>
                      <LicenseBadge
                        licenseType={licenseType}
                        modelDetailsPageUrl={modelDetailsPageUrl}
                      />
                    </div>
                  </EuiFlexItem>
                )}
                {description && (
                  <EuiFlexItem style={{ overflow: 'hidden' }}>
                    <EuiText size="xs">
                      <EuiTextTruncate text={description} />
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        {/* Wrap in a div to prevent the badge from growing to a whole row on mobile */}
        <div>
          <TrainedModelHealth
            modelState={deploymentState}
            modelStateReason={deploymentStateReason}
            isDownloadable={isPlaceholder}
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
