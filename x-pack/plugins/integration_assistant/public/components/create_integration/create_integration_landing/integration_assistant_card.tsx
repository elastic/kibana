/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiBetaBadge,
} from '@elastic/eui';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { useAuthorization } from '../../../common/hooks/use_authorization';
import { MissingPrivilegesTooltip } from '../../../common/components/authorization';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import * as i18n from './translations';

export const IntegrationAssistantCard = React.memo(() => {
  const { canExecuteConnectors } = useAuthorization();
  const navigate = useNavigate();
  return (
    <EuiPanel hasBorder={true} paddingSize="l">
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <AssistantAvatar />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            alignItems="flexStart"
            justifyContent="flexStart"
          >
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>{i18n.ASSISTANT_TITLE}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    iconType="beaker"
                    label={i18n.TECH_PREVIEW}
                    tooltipContent={i18n.TECH_PREVIEW_TOOLTIP}
                    size="s"
                    color="hollow"
                    data-test-subj="techPreviewBadge"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" textAlign="left">
                {i18n.ASSISTANT_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canExecuteConnectors ? (
            <EuiButton onClick={() => navigate(Page.assistant)} data-test-subj="assistantButton">
              {i18n.ASSISTANT_BUTTON}
            </EuiButton>
          ) : (
            <MissingPrivilegesTooltip canExecuteConnectors>
              <EuiButton disabled>{i18n.ASSISTANT_BUTTON}</EuiButton>
            </MissingPrivilegesTooltip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
IntegrationAssistantCard.displayName = 'IntegrationAssistantCard';
