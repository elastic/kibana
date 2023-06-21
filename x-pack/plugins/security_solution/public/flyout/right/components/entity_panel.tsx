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
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiIcon,
} from '@elastic/eui';
import styled from 'styled-components';
import {
  ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID,
  ENTITY_PANEL_HEADER_TEST_ID,
  ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID,
  ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID,
  ENTITY_PANEL_CONTENT_TEST_ID,
} from './test_ids';

const PanelHeaderRightSectionWrapper = styled(EuiFlexItem)`
  margin-right: ${({ theme }) => theme.eui.euiSizeM};
`;

const IconWrapper = styled(EuiIcon)`
  margin: ${({ theme }) => theme.eui.euiSizeS} 0;
`;

export interface EntityPanelProps {
  /**
   * String value of the title to be displayed in the header of panel
   */
  title: string;
  /**
   * Icon string for displaying the specified icon in the header
   */
  iconType: string;
  /**
   * Boolean to determine the panel to be collapsable (with toggle)
   */
  expandable?: boolean;
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
  /** 
  Optional content and actions to be displayed on the right side of header
  */
  headerContent?: React.ReactNode;
  /** 
  Data test subject string for testing
  */
  ['data-test-subj']?: string;
}

/**
 * Panel component to display user or host information.
 */
export const EntityPanel: React.FC<EntityPanelProps> = ({
  title,
  iconType,
  children,
  expandable = false,
  expanded = false,
  headerContent,
  'data-test-subj': dataTestSub,
}) => {
  const [toggleStatus, setToggleStatus] = useState(expanded);
  const toggleQuery = useCallback(() => {
    setToggleStatus(!toggleStatus);
  }, [setToggleStatus, toggleStatus]);

  const toggleIcon = useMemo(
    () => (
      <EuiButtonIcon
        key={`expanded-${expanded}`}
        data-test-subj={ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID}
        aria-label={`entity-toggle`}
        color="text"
        display="empty"
        iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
        onClick={toggleQuery}
        size="s"
      />
    ),
    [toggleStatus, toggleQuery, expanded]
  );

  const headerLeftSection = useMemo(
    () => (
      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          data-test-subj={ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID}
        >
          <EuiFlexItem grow={false}>{expandable && children && toggleIcon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <IconWrapper type={iconType} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <EuiText>{title}</EuiText>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ),
    [title, children, toggleIcon, expandable, iconType]
  );

  const headerRightSection = useMemo(
    () =>
      headerContent && (
        <PanelHeaderRightSectionWrapper
          grow={false}
          data-test-subj={ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID}
        >
          {headerContent}
        </PanelHeaderRightSectionWrapper>
      ),
    [headerContent]
  );

  const showContent = useMemo(() => {
    if (!children) {
      return false;
    }
    return !expandable || (expandable && toggleStatus);
  }, [children, expandable, toggleStatus]);

  return (
    <EuiSplitPanel.Outer grow hasBorder data-test-subj={dataTestSub}>
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        paddingSize={'xs'}
        data-test-subj={ENTITY_PANEL_HEADER_TEST_ID}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          {headerLeftSection}
          {headerRightSection}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {showContent && (
        <EuiSplitPanel.Inner paddingSize="none">
          <EuiPanel data-test-subj={ENTITY_PANEL_CONTENT_TEST_ID}>{children}</EuiPanel>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};

EntityPanel.displayName = 'EntityPanel';
