/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

import { AlertsBadge } from './alerts_badge';
import { MiniAttackChain } from '../tabs/attack_discovery_tab/attack/mini_attack_chain';
import { TakeAction } from './take_action';
import * as i18n from './translations';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}

const ActionsComponent: React.FC<Props> = ({ attackDiscovery, replacements }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="actions" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            margin-right: ${euiTheme.size.s};
          `}
          data-test-subj="attackChainLabel"
          size="xs"
        >
          {i18n.ATTACK_CHAIN}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <MiniAttackChain attackDiscovery={attackDiscovery} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            color: ${euiTheme.colors.lightShade};
            margin-left: ${euiTheme.size.m};
            margin-right: ${euiTheme.size.m};
          `}
          size="s"
        >
          {'|'}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            margin-right: ${euiTheme.size.s};
          `}
          data-test-subj="alertsLabel"
          size="xs"
        >
          {i18n.ALERTS}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AlertsBadge alertsCount={attackDiscovery.alertIds.length} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            color: ${euiTheme.colors.lightShade};
            margin-left: ${euiTheme.size.m};
            margin-right: ${euiTheme.size.m};
          `}
          size="s"
        >
          {'|'}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <TakeAction attackDiscovery={attackDiscovery} replacements={replacements} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ActionsComponent.displayName = 'Actions';

export const Actions = React.memo(ActionsComponent);
