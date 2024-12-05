/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from './translations';

export interface BulkActionsProps {
  isTableLoading: boolean;
  numberOfTranslatedRules: number;
  numberOfSelectedRules: number;
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    numberOfTranslatedRules,
    numberOfSelectedRules,
    installTranslatedRule,
    installSelectedRule,
  }) => {
    const disableInstallTranslatedRulesButton = isTableLoading || !numberOfTranslatedRules;
    const showInstallSelectedRulesButton =
      disableInstallTranslatedRulesButton && numberOfSelectedRules > 0;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {showInstallSelectedRulesButton ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={installSelectedRule}
              disabled={isTableLoading}
              data-test-subj="installSelectedRulesButton"
              aria-label={i18n.INSTALL_SELECTED_ARIA_LABEL}
            >
              {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
              {isTableLoading && <EuiLoadingSpinner size="s" />}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plusInCircle"
            data-test-subj="installTranslatedRulesButton"
            onClick={installTranslatedRule}
            disabled={disableInstallTranslatedRulesButton}
            aria-label={i18n.INSTALL_TRANSLATED_ARIA_LABEL}
          >
            {numberOfTranslatedRules > 0
              ? i18n.INSTALL_TRANSLATED_RULES(numberOfTranslatedRules)
              : i18n.INSTALL_TRANSLATED_RULES_EMPTY_STATE}
            {isTableLoading && <EuiLoadingSpinner size="s" />}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
