/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiRadio,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { KibanaLogic } from '../../../../../shared/kibana';
import { TrainedModelHealth } from '../ml_model_health';

import { ModelSelectLogic } from './model_select_logic';
import { TRAINED_MODELS_PATH } from './utils';

export const getContextMenuPanel = (
  modelDetailsPageUrl?: string
): EuiContextMenuPanelDescriptor[] => {
  return [
    {
      id: 0,
      items: [
        {
          name: i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.actionMenu.tuneModelPerformance.label',
            {
              defaultMessage: 'Tune model performance',
            }
          ),
          icon: 'controlsHorizontal',
          onClick: () =>
            KibanaLogic.values.navigateToUrl(TRAINED_MODELS_PATH, {
              shouldNotCreateHref: true,
            }),
        },
        ...(modelDetailsPageUrl
          ? [
              {
                name: i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.actionMenu.modelDetails.label',
                  {
                    defaultMessage: 'Model details',
                  }
                ),
                icon: 'popout',
                href: modelDetailsPageUrl,
                target: '_blank',
              },
            ]
          : []),
      ],
    },
  ];
};

export type ModelSelectOptionProps = MlModel & {
  label: string;
  checked?: 'on';
};

export const DeployModelButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiButtonEmpty onClick={onClick} disabled={disabled} iconType="download" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.deployButton.label',
        {
          defaultMessage: 'Deploy',
        }
      )}
    </EuiButtonEmpty>
  );
};

export const StartModelButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiButton onClick={onClick} disabled={disabled} color="success" iconType="play" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.startButton.label',
        {
          defaultMessage: 'Start',
        }
      )}
    </EuiButton>
  );
};

export const ModelMenuPopover: React.FC<{
  onClick: () => void;
  closePopover: () => void;
  isOpen: boolean;
  modelDetailsPageUrl?: string;
}> = ({ onClick, closePopover, isOpen, modelDetailsPageUrl }) => {
  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.actionsButton.label',
            {
              defaultMessage: 'All actions',
            }
          )}
          onClick={onClick}
          iconType="boxesHorizontal"
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenu panels={getContextMenuPanel(modelDetailsPageUrl)} initialPanelId={0} />
    </EuiPopover>
  );
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
  licenseType,
  modelDetailsPageUrl,
  deploymentState,
  deploymentStateReason,
  isPlaceholder,
  checked,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onMenuButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled } = useValues(ModelSelectLogic);

  return (
    <EuiFlexGroup alignItems="center" gutterSize={useIsWithinMaxBreakpoint('s') ? 'xs' : 'l'}>
      {/* Selection radio button */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <EuiRadio
          title={title}
          id={modelId}
          checked={checked === 'on'}
          onChange={() => null}
          // @ts-ignore
          inert
        />
      </EuiFlexItem>
      {/* Title, model ID, description, license */}
      <EuiFlexItem style={{ overflow: 'hidden' }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">{modelId}</EuiTextColor>
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
                      <div className="eui-textTruncate" title={description}>
                        {description}
                      </div>
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {/* Status indicator OR action button */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        {/* Wrap in a div to prevent the badge/button from growing to a whole row on mobile */}
        <div>
          {isPlaceholder ? (
            <DeployModelButton
              onClick={() => createModel(modelId)}
              disabled={areActionButtonsDisabled}
            />
          ) : deploymentState === MlModelDeploymentState.Downloaded ? (
            <StartModelButton
              onClick={() => startModel(modelId)}
              disabled={areActionButtonsDisabled}
            />
          ) : (
            <TrainedModelHealth
              modelState={deploymentState}
              modelStateReason={deploymentStateReason}
            />
          )}
        </div>
      </EuiFlexItem>
      {/* Actions menu */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <ModelMenuPopover
          onClick={onMenuButtonClick}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          modelDetailsPageUrl={modelDetailsPageUrl}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
