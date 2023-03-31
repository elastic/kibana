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
} from '@elastic/eui';
import { ENTITY_ICON } from './utils';
import {
  ENTITY_PANEL_TEST_ID,
  ENTITY_PANEL_ICON_TEST_ID,
  ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID,
  ENTITY_PANEL_HEADER_TEST_ID,
  ENTITY_PANEL_CONTENT_TEST_ID,
} from './test_ids';
import type { EntityType } from '../types';

export interface EntityPanelProps {
  title: string;
  type: EntityType;
  content?: string | React.ReactNode;
  expandable?: boolean;
  expanded?: boolean;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({
  title,
  type,
  content,
  expandable = false,
  expanded = false,
}) => {
  const [toggleStatus, setToggleStatus] = useState(expanded);
  const toggleQuery = useCallback(() => {
    setToggleStatus(!toggleStatus);
  }, [setToggleStatus, toggleStatus]);

  const toggleIcon = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj={ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID}
          aria-label={`entity-toggle`}
          color="text"
          display="empty"
          iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
          onClick={toggleQuery}
          size="s"
        />
      </EuiFlexItem>
    ),
    [toggleStatus, toggleQuery]
  );

  const icon = useMemo(() => {
    return (
      <EuiButtonIcon
        data-test-subj={ENTITY_PANEL_ICON_TEST_ID}
        aria-label={`entity-icon-${type}`}
        color="text"
        display="empty"
        iconType={ENTITY_ICON[type]}
        size="s"
      />
    );
  }, [type]);

  const showContent = useMemo(() => {
    if (!content) {
      return false;
    }
    return !expandable || (expandable && toggleStatus);
  }, [content, expandable, toggleStatus]);

  const panelHeader = useMemo(() => {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        data-test-subj={ENTITY_PANEL_HEADER_TEST_ID}
      >
        {expandable && toggleIcon}
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <EuiText>{title}</EuiText>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [title, icon, toggleIcon, expandable]);

  return (
    <EuiSplitPanel.Outer grow hasBorder data-test-subj={ENTITY_PANEL_TEST_ID}>
      <EuiSplitPanel.Inner grow={false} color="subdued" paddingSize="xs">
        {panelHeader}
      </EuiSplitPanel.Inner>
      {showContent && (
        <EuiSplitPanel.Inner paddingSize="none">
          <EuiPanel data-test-subj={ENTITY_PANEL_CONTENT_TEST_ID}>{content}</EuiPanel>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};

EntityPanel.displayName = 'EntityPanel';
