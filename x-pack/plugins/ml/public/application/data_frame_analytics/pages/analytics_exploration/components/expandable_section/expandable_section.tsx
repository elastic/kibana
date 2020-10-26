/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expandable_section.scss';

import React, { useState, FC, ReactNode } from 'react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiText,
} from '@elastic/eui';

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
}

export const ExpandableSection: FC<ExpandableSectionProps> = ({
  headerItems,
  // For now we don't have a need for complete external control
  // and just want to pass in a default value. If we wanted
  // full external control we'd also need to add a onToggleExpanded()
  // callback.
  isExpanded: isExpandedDefault = true,
  content,
  contentPadding = false,
  dataTestId,
  title,
  docsLink,
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <EuiPanel paddingSize="none" data-test-subj={`mlDFExpandableSection-${dataTestId}`}>
      <div className="mlExpandableSection">
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={toggleExpanded}
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              size="l"
              iconSide="right"
              flush="left"
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
                    <EuiText size="xs" color="subdued">
                      <p>{label}</p>
                    </EuiText>
                    <EuiBadge>{value}</EuiBadge>
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
        <div className={contentPadding ? 'mlExpandableSection-contentPadding' : ''}>{content}</div>
      )}
    </EuiPanel>
  );
};
