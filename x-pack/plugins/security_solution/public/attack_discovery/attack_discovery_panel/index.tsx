/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionableSummary } from './actionable_summary';
import { Actions } from './actions';
import { Tabs } from './tabs';
import { Title } from './title';

interface Props {
  attackDiscovery: AttackDiscovery;
  initialIsOpen?: boolean;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const AttackDiscoveryPanelComponent: React.FC<Props> = ({
  attackDiscovery,
  initialIsOpen,
  onToggle,
  replacements,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const htmlId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryAccordion',
  });
  const [isOpen, setIsOpen] = useState<'open' | 'closed'>(initialIsOpen ? 'open' : 'closed');
  const updateIsOpen = useCallback(() => {
    const newState = isOpen === 'open' ? 'closed' : 'open';

    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  const actions = useMemo(
    () => <Actions attackDiscovery={attackDiscovery} replacements={replacements} />,
    [attackDiscovery, replacements]
  );

  const buttonContent = useMemo(
    () => (
      <Title
        isLoading={false}
        replacements={replacements}
        showAnonymized={showAnonymized}
        title={attackDiscovery.title}
      />
    ),
    [attackDiscovery.title, replacements, showAnonymized]
  );

  return (
    <>
      <EuiPanel data-test-subj="attackDiscovery" hasBorder={true}>
        <EuiAccordion
          buttonContent={buttonContent}
          data-test-subj="attackDiscoveryAccordion"
          extraAction={actions}
          forceState={isOpen}
          id={htmlId}
          onToggle={updateIsOpen}
        >
          <span data-test-subj="emptyAccordionContent" />
        </EuiAccordion>

        <EuiSpacer size="m" />

        <ActionableSummary
          attackDiscovery={attackDiscovery}
          replacements={replacements}
          showAnonymized={showAnonymized}
        />
      </EuiPanel>

      {isOpen === 'open' && (
        <EuiPanel
          css={css`
            border-top: none;
            border-radius: 0 0 6px 6px;
            margin: 0 ${euiTheme.size.m} 0 ${euiTheme.size.m};
          `}
          data-test-subj="attackDiscoveryTabsPanel"
          hasBorder={true}
        >
          <Tabs
            attackDiscovery={attackDiscovery}
            replacements={replacements}
            showAnonymized={showAnonymized}
          />
        </EuiPanel>
      )}
    </>
  );
};

AttackDiscoveryPanelComponent.displayName = 'AttackDiscoveryPanel';

export const AttackDiscoveryPanel = React.memo(AttackDiscoveryPanelComponent);
