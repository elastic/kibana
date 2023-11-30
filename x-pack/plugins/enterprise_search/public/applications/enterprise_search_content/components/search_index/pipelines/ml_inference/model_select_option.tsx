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
  EuiPopover,
  EuiRadio,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { KibanaLogic } from '../../../../../shared/kibana';
import { TrainedModelHealth } from '../ml_model_health';

import { ModelSelectLogic } from './model_select_logic';

export const getContextMenuPanel = (
  modelDetailsPageUrl?: string
): EuiContextMenuPanelDescriptor[] => {
  return [
    {
      id: 0,
      items: [
        {
          name: 'Tune model performance',
          icon: 'controlsHorizontal',
          onClick: () =>
            KibanaLogic.values.navigateToUrl('/app/ml/trained_models', {
              shouldNotCreateHref: true,
            }),
        },
        ...(modelDetailsPageUrl
          ? [
              {
                name: 'Model details',
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
      button={<EuiButtonIcon onClick={onClick} iconType="boxesHorizontal" />}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenu panels={getContextMenuPanel(modelDetailsPageUrl)} initialPanelId={0} />
    </EuiPopover>
  );
};

export const ModelSelectOption: React.FC<ModelSelectOptionProps> = ({
  modelId,
  title,
  description,
  license,
  deploymentState,
  deploymentStateReason,
  modelDetailsPageUrl,
  isPlaceholder,
  checked,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onMenuButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled } = useValues(ModelSelectLogic);

  return (
    <EuiFlexGroup alignItems="center">
      {/* Selection radio button */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <EuiRadio id={modelId} checked={checked === 'on'} onChange={() => null} />
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
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              {license && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">License: {license}</EuiBadge>
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
        </EuiFlexGroup>
      </EuiFlexItem>
      {/* Status indicator OR action button */}
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
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
