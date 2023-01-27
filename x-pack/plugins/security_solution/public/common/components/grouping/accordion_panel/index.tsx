/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { isArray } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import type { RawBucket } from '../types';

export interface BadgeMetric {
  title: string;
  value: number;
  color?: string;
  width?: number;
}

export interface CustomMetric {
  title: string;
  customStatRenderer: JSX.Element;
}

interface GroupPanelProps {
  customAccordionButtonClassName?: string;
  customAccordionClassName?: string;
  extraAction?: React.ReactNode;
  forceState?: 'open' | 'closed';
  groupBucket: RawBucket;
  groupPanelRenderer?: JSX.Element;
  level?: number;
  onToggleGroup?: (isOpen: boolean, groupBucket: RawBucket) => void;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  selectedGroup: string;
}

const DefaultGroupPanelRenderer = ({ title }: { title: string }) => (
  <div>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xs" className="euiAccordionForm__title">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

export const createGroupQuery = (selectedGroup: string, groupFieldValue: string) =>
  groupFieldValue && selectedGroup
    ? [
        {
          meta: {
            alias: null,
            disabled: false,
            key: selectedGroup,
            negate: false,
            params: {
              query: groupFieldValue,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              [selectedGroup]: {
                query: groupFieldValue,
              },
            },
          },
        },
      ]
    : [];

const GroupPanelComponent = ({
  customAccordionButtonClassName = 'groupingAccordionForm__button',
  customAccordionClassName = 'groupingAccordionForm',
  extraAction,
  forceState,
  groupBucket,
  groupPanelRenderer,
  level = 0,
  onToggleGroup,
  renderChildComponent,
  selectedGroup,
}: GroupPanelProps) => {
  const groupFieldValue = useMemo(
    () => (groupBucket.key && isArray(groupBucket.key) ? groupBucket.key[0] : groupBucket.key),
    [groupBucket.key]
  );

  const groupFilters = useMemo(
    () => createGroupQuery(selectedGroup, groupFieldValue),
    [groupFieldValue, selectedGroup]
  );

  const onToggle = useCallback(
    (isOpen) => {
      if (onToggleGroup) {
        onToggleGroup(isOpen, groupBucket);
      }
    },
    [groupBucket, onToggleGroup]
  );

  return !groupFieldValue ? null : (
    <EuiAccordion
      buttonClassName={customAccordionButtonClassName}
      buttonContent={groupPanelRenderer ?? <DefaultGroupPanelRenderer title={groupFieldValue} />}
      className={customAccordionClassName}
      data-test-subj="grouping-accordion"
      extraAction={extraAction}
      forceState={forceState}
      id={`group${level}-${groupFieldValue}`}
      onToggle={onToggle}
      paddingSize="l"
    >
      {renderChildComponent(groupFilters)}
    </EuiAccordion>
  );
};

export const GroupPanel = React.memo(GroupPanelComponent);
