/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AssistantAvatar } from '../assistant_avatar';
import { InsightMissingCredentials } from './insight_missing_credentials';
import { InsightError } from './insight_error';
import { InsightGeneratedResponse } from './insight_generated_response';
import { Feedback } from '../feedback_buttons';

export interface InsightProps {
  title: string;
  description?: string;
  date?: Date;
  debug?: boolean;
  actions: Array<{ id: string; label: string; icon?: string; handler: () => void }>;
}

export function Insight({
  title,
  description,
  date = new Date(),
  debug,
  actions = [],
}: InsightProps) {
  const { euiTheme } = useEuiTheme();
  const { uiSettings } = useKibana().services;

  const dateFormat = uiSettings?.get('dateFormat');

  const [isActionsPopoverOpen, setIsActionsPopover] = useState(false);

  const [state, setState] = useState<'missing' | 'error' | 'insightGenerated'>('insightGenerated');

  const handleClickActions = () => {
    setIsActionsPopover(!isActionsPopoverOpen);
  };

  const handleFeedback = (feedback: Feedback) => {};

  const handleRegenerate = () => {};

  const handleStartChat = () => {};

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="obsAiAssistantInsight"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
        buttonContent={
          <EuiFlexGroup wrap responsive={false} gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <AssistantAvatar size="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                <h5>{title}</h5>
              </EuiText>

              <EuiText size="s" css={{ color: euiTheme.colors.subduedText }}>
                <span>{description}</span>
              </EuiText>

              <EuiSpacer size="xs" />

              <EuiText size="xs" css={{ color: euiTheme.colors.subduedText }}>
                <strong>
                  {i18n.translate('xpack.observabilityAiAssistant.insight.generatedAt', {
                    defaultMessage: 'Generated at',
                  })}{' '}
                  {moment(date).format(dateFormat)}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.observabilityAiAssistant.insight.actions', {
                  defaultMessage: 'Actions',
                })}
                color="text"
                css={{ alignSelf: 'flex-start' }}
                disabled={actions.length === 0}
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
              items={actions.map(({ id, icon, label, handler }) => (
                <EuiContextMenuItem key={id} icon={icon} onClick={handler}>
                  {label}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        }
      >
        <EuiSpacer size="m" />

        {/* Debug controls. */}
        {debug ? (
          <EuiFilterGroup style={{ position: 'absolute', bottom: 20, left: 20 }}>
            <EuiFilterButton
              hasActiveFilters={state === 'insightGenerated'}
              onClick={() => setState('insightGenerated')}
            >
              Normal
            </EuiFilterButton>
            <EuiFilterButton
              withNext
              hasActiveFilters={state === 'missing'}
              onClick={() => setState('missing')}
            >
              Missing credentials
            </EuiFilterButton>
            <EuiFilterButton hasActiveFilters={state === 'error'} onClick={() => setState('error')}>
              Error
            </EuiFilterButton>
          </EuiFilterGroup>
        ) : null}

        {state === 'insightGenerated' ? (
          <InsightGeneratedResponse
            answer={''}
            onClickFeedback={handleFeedback}
            onClickRegenerate={handleRegenerate}
            onClickStartChat={handleStartChat}
          />
        ) : null}

        {state === 'error' ? <InsightError /> : null}

        {state === 'missing' ? <InsightMissingCredentials /> : null}
      </EuiAccordion>
    </EuiPanel>
  );
}
