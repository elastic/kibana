/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { getTacticMetadata } from '../../helpers';
import { ATTACK_CHAIN_TOOLTIP } from './translations';

interface Props {
  attackDiscovery: AttackDiscovery;
}

const MiniAttackChainComponent: React.FC<Props> = ({ attackDiscovery }) => {
  const { euiTheme } = useEuiTheme();
  const tactics = useMemo(() => getTacticMetadata(attackDiscovery), [attackDiscovery]);
  const detectedTactics = useMemo(() => tactics.filter((tactic) => tactic.detected), [tactics]);

  const detectedTacticsList = useMemo(
    () =>
      detectedTactics.map(({ name, detected }) => (
        <li key={name}>
          {' - '}
          {name}
        </li>
      )),
    [detectedTactics]
  );

  const tooltipContent = useMemo(
    () => (
      <>
        <p>{ATTACK_CHAIN_TOOLTIP(detectedTactics.length)}</p>
        <ul>{detectedTacticsList}</ul>
      </>
    ),
    [detectedTactics.length, detectedTacticsList]
  );

  return (
    <EuiToolTip content={tooltipContent} data-test-subj="miniAttackChainToolTip" position="top">
      <EuiFlexGroup alignItems="center" data-test-subj="miniAttackChain" gutterSize="none">
        {tactics.map(({ name, detected }) => (
          <EuiFlexItem grow={false} key={name}>
            <EuiText
              css={css`
                color: ${detected ? euiTheme.colors?.danger : euiTheme.colors?.subduedText};
                font-size: ${detected ? '14px' : '8px'};
                font-weight: ${detected ? euiTheme.font.weight.bold : euiTheme.font.weight.regular};
                margin-right: ${euiTheme.size.xs};
              `}
              data-test-subj="circle"
            >
              {'o'}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

MiniAttackChainComponent.displayName = 'MiniAttackChain';

export const MiniAttackChain = React.memo(MiniAttackChainComponent);
