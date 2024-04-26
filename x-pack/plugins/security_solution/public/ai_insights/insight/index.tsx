/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import type { Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionableSummary } from './actionable_summary';
import { Actions } from './actions';
import { Tabs } from './tabs';
import { Title } from './title';
import type { AlertsInsight } from '../types';

interface Props {
  initialIsOpen?: boolean;
  insight: AlertsInsight;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const InsightComponent: React.FC<Props> = ({
  initialIsOpen,
  insight,
  onToggle,
  replacements,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const htmlId = useGeneratedHtmlId({
    prefix: 'insightAccordion',
  });
  const [isOpen, setIsOpen] = useState<'open' | 'closed'>(initialIsOpen ? 'open' : 'closed');
  const updateIsOpen = useCallback(() => {
    const newState = isOpen === 'open' ? 'closed' : 'open';

    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  const actions = useMemo(
    () => <Actions insight={insight} replacements={replacements} />,
    [insight, replacements]
  );

  const buttonContent = useMemo(
    () => <Title isLoading={false} title={insight.title} />,
    [insight.title]
  );

  return (
    <>
      <EuiPanel data-test-subj="insight" hasBorder={true}>
        <EuiAccordion
          buttonContent={buttonContent}
          data-test-subj="insightAccordion"
          extraAction={actions}
          forceState={isOpen}
          id={htmlId}
          onToggle={updateIsOpen}
        >
          <span data-test-subj="emptyAccordionContent" />
        </EuiAccordion>

        <EuiSpacer size="m" />

        <ActionableSummary
          insight={insight}
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
          data-test-subj="insightTabsPanel"
          hasBorder={true}
        >
          <Tabs insight={insight} replacements={replacements} showAnonymized={showAnonymized} />
        </EuiPanel>
      )}
    </>
  );
};

InsightComponent.displayName = 'Insight';

export const Insight = React.memo(InsightComponent);
