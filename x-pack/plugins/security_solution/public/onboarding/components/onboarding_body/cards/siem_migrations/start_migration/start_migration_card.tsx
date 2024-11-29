/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon, EuiButton, EuiPanel } from '@elastic/eui';
import { SiemMigrationsIcon } from '../../../../../../siem_migrations/common/icon';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import type { StartMigrationCardMetadata } from './types';
import { useStyles } from './start_migration_card.styles';
import * as i18n from './translations';

export const UploadRulesCard: OnboardingCardComponent<StartMigrationCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const { siemMigrations } = useKibana().services;
  const styles = useStyles();
  const stats = checkCompleteMetadata?.migrationsStats;

  return (
    <OnboardingCardContentPanel paddingSize="none">
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiFlexGroup direction="row" alignItems="center" className={styles}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={SiemMigrationsIcon} className="siemMigrationsIcon" />
          </EuiFlexItem>
          <EuiFlexItem>
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="download" iconSide="right">
              {i18n.START_MIGRATION_CARD_UPLOAD_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default UploadRulesCard;
