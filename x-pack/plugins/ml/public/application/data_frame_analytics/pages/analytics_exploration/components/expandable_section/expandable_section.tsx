/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expandable_section.scss';

import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import {
  getDefaultExplorationPageUrlState,
  useExplorationUrlState,
} from '../../hooks/use_exploration_url_state';
import type { ExpandablePanels } from '../../../../../../../common/types/locator';

interface HeaderItem {
  // id is used as the React key and to construct a data-test-subj
  id: string;
  label?: ReactNode;
  value: ReactNode;
}

const isHeaderItems = (arg: any): arg is HeaderItem[] => {
  return Array.isArray(arg);
};

export const HEADER_ITEMS_LOADING = 'header_items_loading';

export interface ExpandableSectionProps {
  content: ReactNode;
  contentPadding?: boolean;
  docsLink?: ReactNode;
  headerItems?: HeaderItem[] | typeof HEADER_ITEMS_LOADING;
  isExpanded?: boolean;
  dataTestId: string;
  title: ReactNode;
  urlStateKey: ExpandablePanels;
}

export const ExpandableSection: FC<ExpandableSectionProps> = ({
  headerItems,
  content,
  isExpanded: isExpandedDefault,
  contentPadding = false,
  dataTestId,
  title,
  docsLink,
  urlStateKey,
}) => {
  const overrides = useMemo(
    () => (isExpandedDefault !== undefined ? { [urlStateKey]: isExpandedDefault } : undefined),
    [urlStateKey, isExpandedDefault]
  );
  const [pageUrlState, setPageUrlState] = useExplorationUrlState(overrides);

  const isExpanded =
    isExpandedDefault !== undefined &&
    pageUrlState[urlStateKey] === getDefaultExplorationPageUrlState(overrides)[urlStateKey]
      ? isExpandedDefault
      : pageUrlState[urlStateKey];

  const toggleExpanded = useCallback(() => {
    setPageUrlState({ [urlStateKey]: !isExpanded });
  }, [isExpanded, setPageUrlState, urlStateKey]);

  return (
    <EuiPanel
      paddingSize="none"
      data-test-subj={`mlDFExpandableSection-${dataTestId}`}
      hasShadow={false}
      hasBorder
    >
      <div className="mlExpandableSection">
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={toggleExpanded}
                  iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                  iconSide="left"
                  flush="left"
                  data-test-subj={`mlDFExpandableSection-${dataTestId}-toggle-button`}
                >
                  <EuiText size="m" color="default" style={{ fontWeight: 'bold' }}>
                    <p>{title}</p>
                  </EuiText>
                </EuiButtonEmpty>
              </EuiFlexItem>
              {headerItems === HEADER_ITEMS_LOADING && <EuiSkeletonText lines={1} />}
              {isHeaderItems(headerItems)
                ? headerItems.map(({ label, value, id }) => (
                    <EuiFlexItem
                      grow={false}
                      key={id}
                      data-test-subj={`mlDFExpandableSectionItem-${dataTestId}-${id}`}
                    >
                      {label !== undefined && value !== undefined ? (
                        <EuiFlexGroup gutterSize="xs" alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" textAlign="center">
                              <p>{label}</p>
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiBadge>{value}</EuiBadge>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ) : null}
                      {label === undefined ? (
                        <EuiFlexGroup alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" color="subdued" textAlign="center">
                              {value}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ) : null}
                    </EuiFlexItem>
                  ))
                : null}
            </EuiFlexGroup>
          </EuiFlexItem>
          {docsLink !== undefined && <EuiFlexItem grow={false}>{docsLink}</EuiFlexItem>}
        </EuiFlexGroup>
      </div>
      {isExpanded && (
        <div
          className={contentPadding ? 'mlExpandableSection-contentPadding' : ''}
          data-test-subj={`mlDFExpandableSection-${dataTestId}-content`}
        >
          {content}
        </div>
      )}
    </EuiPanel>
  );
};
