/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import { SiemMigrationsIcon } from '../../../../../../siem_migrations/common/icon';
import { useStyles } from './upload_rules_panel.styles';
import * as i18n from './translations';
import { useStartMigrationContext } from './context';

export interface UploadRulesPanelProps {
  isUploadMore?: boolean;
}
export const UploadRulesPanel = React.memo<UploadRulesPanelProps>(({ isUploadMore = false }) => {
  const styles = useStyles(isUploadMore);
  const { setIsFlyoutOpen } = useStartMigrationContext();
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), [setIsFlyoutOpen]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize={isUploadMore ? 'm' : 'l'}>
      <EuiFlexGroup direction="row" alignItems="center" className={styles}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={SiemMigrationsIcon} className="siemMigrationsIcon" />
        </EuiFlexItem>
        <EuiFlexItem>
          {isUploadMore ? (
            <EuiText size="s" className="siemMigrationsUploadTitle">
              <p>{i18n.START_MIGRATION_CARD_UPLOAD_MORE_TITLE}</p>
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="m" className="siemMigrationsUploadTitle">
                  <p>{i18n.START_MIGRATION_CARD_UPLOAD_TITLE}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>{i18n.START_MIGRATION_CARD_UPLOAD_DESCRIPTION}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <p>{i18n.START_MIGRATION_CARD_UPLOAD_READ_MORE}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isUploadMore ? (
            <EuiButtonEmpty iconType="download" iconSide="right" onClick={openFlyout}>
              {i18n.START_MIGRATION_CARD_UPLOAD_MORE_BUTTON}
            </EuiButtonEmpty>
          ) : (
            <EuiButton iconType="download" iconSide="right" onClick={openFlyout}>
              {i18n.START_MIGRATION_CARD_UPLOAD_BUTTON}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
UploadRulesPanel.displayName = 'UploadRulesPanel';
