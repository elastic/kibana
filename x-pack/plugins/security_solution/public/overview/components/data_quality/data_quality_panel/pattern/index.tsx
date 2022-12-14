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
import { getDocsCount, getIndexNames } from '../../helpers';
import { IndexProperties } from '../index_properties';
import { IndexStats } from '../index_properties/index_stats';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import { PatternSummary } from './pattern_summary';
import * as i18n from './translations';
import type { EcsMetadata } from '../../types';
import { useStats } from '../../use_stats';

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
  const { error, loading, stats } = useStats(pattern);
  const indexNames = useMemo(() => getIndexNames(stats), [stats]);
  const [accordionState, setAccordionState] = useState<AccordionState[]>(
    getInitialAccordionState({ expandFirstResult, indexNames })
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
            stats != null ? (
              <IndexStats
                docsCount={getDocsCount({ stats, indexName })}
                indexName={indexName}
                pattern={pattern}
              />
            ) : (
              indexName
            ),
        }),
        {}
      ),
    [indexNames, pattern, stats]
  );

  const totalDocsCount: number = useMemo(
    () =>
      indexNames.reduce(
        (acc: number, indexName: string) => acc + getDocsCount({ stats, indexName }),
        0
      ),
    [indexNames, stats]
  );

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <PatternSummary
            indexCount={indexNames.length}
            pattern={pattern}
            totalDocsCount={totalDocsCount}
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
