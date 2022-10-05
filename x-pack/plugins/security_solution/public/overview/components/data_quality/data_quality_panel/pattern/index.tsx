/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';

import type { EcsMetadata } from '../../types';
import { getIndexNames } from '../../helpers';
import * as i18n from '../../translations';
import { IndexProperties } from '../index_properties';
import { useMappings } from '../../use_mappings';

export type AccordionState = 'closed' | 'open';

export const getInitialAccordionState = (indexNames: string[]): AccordionState[] =>
  indexNames.map((_, i) => (i === 0 ? 'open' : 'closed'));

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
  pattern: string;
  version: string;
}

const PatternComponent: React.FC<Props> = ({ ecsMetadata, pattern, version }) => {
  const { indexes } = useMappings(pattern);
  const indexNames = useMemo(() => getIndexNames(indexes), [indexes]);
  const [accordionState, setAccordionState] = useState<AccordionState[]>(
    getInitialAccordionState(indexNames)
  );

  useEffect(() => {
    setAccordionState(getInitialAccordionState(indexNames));
  }, [indexNames]);

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{pattern}</h4>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <span>
            {i18n.INDEXES}
            {': '}
            {indexNames.length}
          </span>
          <EuiSpacer />
        </EuiFlexItem>

        {indexNames.map((indexName, i) => (
          <EuiFlexItem grow={false} key={indexName}>
            <EuiAccordion
              buttonContent={indexName}
              forceState={accordionState[i]}
              id={indexName}
              onToggle={getOnToggle({ accordionState, index: i, setAccordionState })}
            >
              {indexes != null && (
                <IndexProperties
                  ecsMetadata={ecsMetadata}
                  indexName={indexName}
                  mappingsProperties={indexes[indexName].mappings.properties}
                  version={version}
                />
              )}
            </EuiAccordion>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const Pattern = React.memo(PatternComponent);
