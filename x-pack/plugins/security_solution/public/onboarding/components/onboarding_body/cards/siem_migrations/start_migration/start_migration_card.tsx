/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme, EuiIcon, EuiButton } from '@elastic/eui';
import { SiemMigrationsIcon } from '../../../../../../siem_migrations/common/icon';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import type { StartMigrationCardMetadata } from './types';
// import * as i18n from './translations';

export const UploadRulesCard: OnboardingCardComponent<StartMigrationCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const { siemMigrations } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const stats = checkCompleteMetadata?.migrationsStats;

  return (
    <OnboardingCardContentPanel>
      <EuiFlexGroup direction="row" justifyContent="center">
        <EuiFlexItem>
          <EuiIcon
            type={SiemMigrationsIcon}
            style={{ blockSize: euiTheme.size.xxxxl, inlineSize: euiTheme.size.xxxxl }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h2>{'todo'}</h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton iconType="upload">{'todo: UPLOAD RULES'}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default UploadRulesCard;
