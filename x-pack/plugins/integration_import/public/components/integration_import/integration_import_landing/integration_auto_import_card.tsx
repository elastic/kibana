/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { useAuthorization } from '../../../common/hooks/use_authorization';
import { MissingPrivilegesTooltip } from '../../../common/components/authorization';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import * as i18n from './translations';

const useAutoImportCardCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    /* compensate for EuiCard children margin-block-start */
    margin-block-start: calc(${euiTheme.size.s} * -2);
  `;
};

export const IntegrationAutoImportCard = React.memo(() => {
  const { canExecuteConnectors } = useAuthorization();
  const navigate = useNavigate();
  const autoImportCardCss = useAutoImportCardCss();
  return (
    <EuiCard
      display="plain"
      hasBorder={true}
      paddingSize="l"
      title={''} // title shown inside the child component
      betaBadgeProps={{
        label: i18n.TECH_PREVIEW,
        tooltipContent: i18n.TECH_PREVIEW_TOOLTIP,
      }}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="l"
        alignItems="center"
        justifyContent="center"
        css={autoImportCardCss}
      >
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
              <EuiTitle size="xs">
                <h3>{i18n.AUTO_IMPORT_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" textAlign="left">
                {i18n.AUTO_IMPORT_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canExecuteConnectors ? (
            <EuiButton onClick={() => navigate(Page.autoImport)}>{i18n.AUTO_IMPORT_BUTTON}</EuiButton>
          ) : (
            <MissingPrivilegesTooltip canExecuteConnectors>
              <EuiButton disabled>{i18n.AUTO_IMPORT_BUTTON}</EuiButton>
            </MissingPrivilegesTooltip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
});
IntegrationAutoImportCard.displayName = 'IntegrationImportCard';
