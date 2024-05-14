/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AssistantAvatar } from '../assistant_avatar';

export interface InsightBaseProps {
  title: string;
  description?: string;
  controls?: React.ReactNode;
  debug?: boolean;
  actions?: Array<{ id: string; label: string; icon?: string; handler: () => void }>;
  onToggle: (isOpen: boolean) => void;
  children: React.ReactNode;
  isOpen: boolean;
  loading?: boolean;
  dataTestSubj?: string;
}

export function InsightBase({
  title,
  description = i18n.translate('xpack.observabilityAiAssistant.insight.defaultDescription', {
    defaultMessage: 'Get helpful insights from our Elastic AI Assistant.',
  }),
  controls,
  children,
  actions,
  onToggle,
  loading,
  isOpen,
  dataTestSubj = 'obsAiAssistantInsightButton',
}: InsightBaseProps) {
  const { euiTheme } = useEuiTheme();

  const [isActionsPopoverOpen, setIsActionsPopover] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopover(!isActionsPopoverOpen);
  };

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="obsAiAssistantInsight"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
        buttonContent={
          <EuiFlexGroup wrap responsive={false} gutterSize="m" data-test-subj={dataTestSubj}>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <AssistantAvatar size="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                  <h5>{title}</h5>
                </EuiText>

                <EuiIconTip
                  content={i18n.translate('xpack.observabilityAiAssistant.insight.iconTooltip', {
                    defaultMessage:
                      'Every contextual insight can be changed with a custom prompt defined by the user. You can always reset it to the default.',
                  })}
                  position="right"
                />
              </EuiFlexGroup>
              <EuiText size="s" css={{ color: euiTheme.colors.subduedText }}>
                <span>{description}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={loading}
        isDisabled={loading}
        forceState={isOpen ? 'open' : 'closed'}
        extraAction={
          actions?.length || controls ? (
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              {controls && <EuiFlexItem grow={false}>{controls}</EuiFlexItem>}
              {actions?.length ? (
                <EuiFlexItem>
                  <EuiPopover
                    anchorPosition="downLeft"
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.observabilityAiAssistant.insight.actions',
                          {
                            defaultMessage: 'Actions',
                          }
                        )}
                        color="text"
                        css={{ alignSelf: 'flex-start' }}
                        data-test-subj="observabilityAiAssistantInsightBaseButtonIcon"
                        disabled={actions?.length === 0}
                        display="empty"
                        iconType="boxesHorizontal"
                        size="s"
                        onClick={handleClickActions}
                      />
                    }
                    panelPaddingSize="s"
                    closePopover={handleClickActions}
                    isOpen={isActionsPopoverOpen}
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={actions?.map(({ id, icon, label, handler }) => (
                        <EuiContextMenuItem key={id} icon={icon} onClick={handler}>
                          {label}
                        </EuiContextMenuItem>
                      ))}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ) : null
        }
        onToggle={onToggle}
      >
        <EuiSpacer size="m" />
        <EuiPanel
          hasBorder={false}
          hasShadow={false}
          color="subdued"
          data-test-subj="obsAiAssistantInsightResponse"
        >
          {children}
        </EuiPanel>
      </EuiAccordion>
    </EuiPanel>
  );
}
