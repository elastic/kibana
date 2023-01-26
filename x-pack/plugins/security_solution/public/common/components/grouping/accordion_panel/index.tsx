/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { isArray } from 'lodash/fp';
import React, { useMemo } from 'react';
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
  level?: number;
  groupBucket: RawBucket;
  selectedGroup: string;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  groupPanelRenderer?: JSX.Element;
  onToggleGroup?: (isOpen: boolean, groupBucket: RawBucket) => void;
  customAccordionClassName?: string;
  customAccordionButtonClassName?: string;
  extraAction?: React.ReactNode;
  forceState: 'open' | 'closed' | undefined;
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

const GroupPanelComponent = ({
  level = 0,
  groupBucket,
  selectedGroup,
  renderChildComponent,
  groupPanelRenderer,
  onToggleGroup,
  extraAction,
  customAccordionClassName = 'groupingAccordionForm',
  customAccordionButtonClassName = 'groupingAccordionForm__button',
  forceState,
}: GroupPanelProps) => {
  const groupFieldValue =
    groupBucket.key && isArray(groupBucket.key) ? groupBucket.key[0] : groupBucket.key;

  const groupFiltersMemo = useMemo(() => {
    const groupFilters = [];
    if (groupFieldValue && selectedGroup) {
      groupFilters.push({
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: selectedGroup,
          params: {
            query: groupFieldValue,
          },
        },
        query: {
          match_phrase: {
            [selectedGroup]: {
              query: groupFieldValue,
            },
          },
        },
      });
    }
    return groupFilters;
  }, [groupFieldValue, selectedGroup]);

  if (!groupFieldValue) {
    return null;
  }
  return (
    <EuiAccordion
      id={`group${level}-${groupFieldValue}`}
      className={customAccordionClassName}
      buttonClassName={customAccordionButtonClassName}
      buttonContent={groupPanelRenderer ?? <DefaultGroupPanelRenderer title={groupFieldValue} />}
      extraAction={extraAction}
      paddingSize="l"
      forceState={forceState}
      onToggle={(isOpen) => {
        if (onToggleGroup) {
          onToggleGroup(isOpen, groupBucket);
        }
      }}
    >
      {renderChildComponent(groupFiltersMemo)}
    </EuiAccordion>
  );
};

export const GroupPanel = React.memo(GroupPanelComponent);
