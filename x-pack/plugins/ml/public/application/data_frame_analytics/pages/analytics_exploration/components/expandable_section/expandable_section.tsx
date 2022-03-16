/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expandable_section.scss';

import React, { FC, ReactNode, useCallback, useMemo } from 'react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import {
  getDefaultExplorationPageUrlState,
  useExplorationUrlState,
} from '../../hooks/use_exploration_url_state';
import { ExpandablePanels } from '../../../../../../../common/types/locator';

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
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={toggleExpanded}
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              iconSide="right"
              flush="left"
              data-test-subj={`mlDFExpandableSection-${dataTestId}-toggle-button`}
            >
              {title}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {docsLink !== undefined && <EuiFlexItem grow={false}>{docsLink}</EuiFlexItem>}
        </EuiFlexGroup>
        {headerItems === HEADER_ITEMS_LOADING && <EuiLoadingContent lines={1} />}
        {isHeaderItems(headerItems) && (
          <EuiFlexGroup>
            {headerItems.map(({ label, value, id }) => (
              <EuiFlexItem
                grow={false}
                key={id}
                data-test-subj={`mlDFExpandableSectionItem-${dataTestId}-${id}`}
              >
                {label !== undefined && value !== undefined && (
                  <>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          <p>{label}</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiBadge>{value}</EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
                {label === undefined && (
                  <EuiText size="xs" color="subdued">
                    {value}
                  </EuiText>
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
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
