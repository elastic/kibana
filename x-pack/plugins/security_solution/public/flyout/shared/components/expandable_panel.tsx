/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiText,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface ExpandablePanelPanelProps {
  header: {
    /**
     * String value of the title to be displayed in the header of panel
     */
    title: string;
    /**
     * Callback function to be called when the title is clicked
     */
    callback?: () => void;
    /**
     * Icon string for displaying the specified icon in the header
     */
    iconType: string;
    /**
     * Optional content and actions to be displayed on the right side of header
     */
    headerContent?: React.ReactNode;
  };
  content?: {
    /**
     * Renders a loading spinner if true
     */
    loading?: boolean;
    /**
     * Returns a null component if true
     */
    error?: boolean;
  };
  expand?: {
    /**
     * Boolean to determine the panel to be collapsable (with toggle)
     */
    expandable?: boolean;
    /**
     * Boolean to allow the component to be expanded or collapsed on first render
     */
    expandedOnFirstRender?: boolean;
  };
  /**
  Data test subject string for testing
  */
  ['data-test-subj']?: string;
}

/**
 * Wrapper component that is composed of a header section and a content section.
 * The header can display an icon, a title (that can be a link), and an optional content section on the right.
 * The content section can display a loading spinner, an error message, or any other content.
 * The component can be expanded or collapsed by clicking on the chevron icon on the left of the title.
 */
export const ExpandablePanel: React.FC<ExpandablePanelPanelProps> = ({
  header: { title, callback, iconType, headerContent },
  content: { loading, error } = { loading: false, error: false },
  expand: { expandable, expandedOnFirstRender } = {
    expandable: false,
    expandedOnFirstRender: false,
  },
  'data-test-subj': dataTestSubj,
  children,
}) => {
  const [toggleStatus, setToggleStatus] = useState(expandedOnFirstRender);
  const toggleQuery = useCallback(() => {
    setToggleStatus(!toggleStatus);
  }, [setToggleStatus, toggleStatus]);

  const toggleIcon = useMemo(
    () => (
      <EuiButtonIcon
        data-test-subj={`${dataTestSubj}ToggleIcon`}
        aria-label={`entity-toggle`}
        color="text"
        display="empty"
        iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
        onClick={toggleQuery}
        size="xs"
      />
    ),
    [dataTestSubj, toggleStatus, toggleQuery]
  );

  const { euiTheme } = useEuiTheme();

  const headerLeftSection = useMemo(
    () => (
      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          data-test-subj={`${dataTestSubj}LeftSection`}
        >
          <EuiFlexItem grow={false}>{expandable && children && toggleIcon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              color={callback ? 'primary' : 'text'}
              type={iconType}
              css={css`
                margin: ${euiTheme.size.s} 0;
              `}
              data-test-subj={`${dataTestSubj}TitleIcon`}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {callback ? (
              <EuiLink
                css={css`
                  font-size: 12px;
                  font-weight: 700;
                `}
                data-test-subj={`${dataTestSubj}TitleLink`}
                onClick={callback}
              >
                {title}
              </EuiLink>
            ) : (
              <EuiTitle size="xxxs">
                <EuiText data-test-subj={`${dataTestSubj}TitleText`}>{title}</EuiText>
              </EuiTitle>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ),
    [dataTestSubj, expandable, children, toggleIcon, callback, iconType, euiTheme.size.s, title]
  );

  const headerRightSection = useMemo(
    () =>
      headerContent && (
        <EuiFlexItem
          grow={false}
          css={css`
            margin-right: ${euiTheme.size.m};
          `}
          data-test-subj={`${dataTestSubj}RightSection`}
        >
          {headerContent}
        </EuiFlexItem>
      ),
    [dataTestSubj, euiTheme.size.m, headerContent]
  );

  const showContent = useMemo(() => {
    if (!children) {
      return false;
    }
    return !expandable || (expandable && toggleStatus);
  }, [children, expandable, toggleStatus]);

  const content = loading ? (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner data-test-subj={`${dataTestSubj}Loading`} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : error ? null : (
    children
  );

  return (
    <EuiSplitPanel.Outer grow hasBorder data-test-subj={dataTestSubj}>
      <EuiSplitPanel.Inner grow={false} color="subdued" paddingSize={'xs'}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          {headerLeftSection}
          {headerRightSection}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {showContent && (
        <EuiSplitPanel.Inner paddingSize="none">
          <EuiPanel data-test-subj={`${dataTestSubj}Content`}>{content}</EuiPanel>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};

ExpandablePanel.displayName = 'ExpandablePanel';
