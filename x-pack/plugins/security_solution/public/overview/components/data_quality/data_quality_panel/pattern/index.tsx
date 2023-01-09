/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { ErrorEmptyPrompt } from '../error_empty_prompt';
import { getIlmExplainPhaseCounts, getIlmPhase } from './helpers';
import { getDocsCount, getIndexNames, getTotalDocsCount } from '../../helpers';
import { IndexProperties } from '../index_properties';
import { IndexSummary } from '../index_properties/index_summary';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import { PatternSummary } from './pattern_summary';
import { useIlmExplain } from '../../use_ilm_explain';
import { useStats } from '../../use_stats';
import * as i18n from './translations';
import type { EcsMetadata } from '../../types';

export type AccordionState = 'closed' | 'open';

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__buttonContent {
    margin-bottom: ${euiThemeVars.euiSizeS};
    width: 100%;
  }
`;

export const getInitialAccordionState = ({
  expandFirstResult,
  indexNames,
}: {
  expandFirstResult: boolean;
  indexNames: string[];
}): AccordionState[] =>
  indexNames.map((_, i) => (expandFirstResult && i === 0 ? 'open' : 'closed'));

export const getAccordionState = (isOpen: boolean): AccordionState => (isOpen ? 'open' : 'closed');
export const getOppositeAccordionState = (isOpen: boolean): AccordionState =>
  isOpen ? 'closed' : 'open';

export const getOnToggle =
  ({
    accordionState,
    index,
    setAccordionState,
  }: {
    accordionState: AccordionState[];
    index: number;
    setAccordionState: (accordionState: AccordionState[]) => void;
  }) =>
  (isOpen: boolean) =>
    setAccordionState(
      accordionState.map((_, i) => (i === index ? getAccordionState(isOpen) : 'closed'))
    );

interface Props {
  ecsMetadata: Record<string, EcsMetadata> | null;
  expandFirstResult?: boolean;
  pattern: string;
  version: string;
}

const PatternComponent: React.FC<Props> = ({
  ecsMetadata,
  expandFirstResult = false,
  pattern,
  version,
}) => {
  const { error: statsError, loading: loadingStats, stats } = useStats(pattern);
  const { error: ilmExplainError, loading: loadingIlmExplain, ilmExplain } = useIlmExplain(pattern);
  const loading = useMemo(
    () => loadingStats || loadingIlmExplain,
    [loadingIlmExplain, loadingStats]
  );
  const error = useMemo(() => statsError ?? ilmExplainError, [ilmExplainError, statsError]);

  const indexNames = useMemo(() => getIndexNames(stats), [stats]);
  const [accordionState, setAccordionState] = useState<AccordionState[]>(
    getInitialAccordionState({ expandFirstResult, indexNames })
  );

  const patternDocsCount = useMemo(
    () => getTotalDocsCount({ indexNames, stats }),
    [indexNames, stats]
  );

  useEffect(() => {
    setAccordionState(getInitialAccordionState({ expandFirstResult, indexNames }));
  }, [expandFirstResult, indexNames]);

  const accordionButtons: Record<string, React.ReactNode> = useMemo(
    () =>
      indexNames.reduce(
        (acc, indexName) => ({
          ...acc,
          [indexName]:
            stats != null && ilmExplain != null ? (
              <IndexSummary
                docsCount={getDocsCount({ stats, indexName })}
                ilmPhase={getIlmPhase(ilmExplain[indexName])}
                indexName={indexName}
                pattern={pattern}
                patternDocsCount={patternDocsCount}
              />
            ) : (
              indexName
            ),
        }),
        {}
      ),
    [ilmExplain, indexNames, pattern, patternDocsCount, stats]
  );

  const ilmExplainPhaseCounts = useMemo(() => getIlmExplainPhaseCounts(ilmExplain), [ilmExplain]);

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <PatternSummary
            ilmExplainPhaseCounts={ilmExplainPhaseCounts}
            pattern={pattern}
            patternDocsCount={patternDocsCount}
          />
          <EuiSpacer />
        </EuiFlexItem>

        {!loading && error != null && (
          <ErrorEmptyPrompt
            error={i18n.ERROR_LOADING_STATS_BODY(error)}
            title={i18n.ERROR_LOADING_STATS_TITLE}
          />
        )}

        {loading && <LoadingEmptyPrompt loading={i18n.LOADING_STATS} />}

        {!loading &&
          stats != null &&
          indexNames.map((indexName, i) => (
            <EuiFlexItem grow={false} key={indexName}>
              <StyledEuiAccordion
                buttonContent={accordionButtons[indexName]}
                forceState={accordionState[i]}
                id={indexName}
                onToggle={getOnToggle({ accordionState, index: i, setAccordionState })}
              >
                <IndexProperties
                  docsCount={getDocsCount({ stats, indexName })}
                  ecsMetadata={ecsMetadata}
                  indexName={indexName}
                  version={version}
                />
              </StyledEuiAccordion>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

PatternComponent.displayName = 'PatternComponent';
export const Pattern = React.memo(PatternComponent);
