/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import * as i18n from '../../translations';

interface Props {
  collapsed: boolean;
  patterns: string[];
  setCollapsed: (collapsed: boolean) => void;
  subtitle?: React.ReactNode;
  title: string;
}

interface Options {
  label: string;
}

const HeaderComponent: React.FC<Props> = ({
  collapsed,
  patterns,
  setCollapsed,
  subtitle,
  title,
}) => {
  const onToggleCollapse = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const options: Options[] = useMemo(
    () => patterns.map((pattern) => ({ label: pattern })),
    [patterns]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="data-quality-panel-header"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          data-test-subj="data-quality-panel-header"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="collapse-button"
              aria-label={i18n.COLLAPSE_BUTTON_LABEL(collapsed)}
              color="text"
              display="empty"
              iconType={collapsed ? 'arrowRight' : 'arrowDown'}
              onClick={onToggleCollapse}
              size="s"
              title={i18n.COLLAPSE_BUTTON_LABEL(collapsed)}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h4 data-test-subj="header-section-title">
                <span className="eui-textBreakNormal">{title}</span>
              </h4>
            </EuiTitle>
            <>{subtitle}</>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {!collapsed && (
        <EuiFlexItem grow={false}>
          <EuiComboBox
            aria-label={i18n.INDEXES}
            isDisabled={true}
            placeholder={i18n.INDEXES_PLACEHOLDER}
            options={options}
            selectedOptions={options}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

HeaderComponent.displayName = 'HeaderComponent';

export const Header = React.memo(HeaderComponent);
