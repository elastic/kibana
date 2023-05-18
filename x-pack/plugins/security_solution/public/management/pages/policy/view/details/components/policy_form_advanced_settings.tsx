/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { PolicyFormSectionTitle } from './policy_form_section_title';
import { PolicyAdvanced } from '../..';
import { AdvancedPolicySchema } from '../../../models/advanced_policy_schema';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import { PolicyFormRowLayout } from './policy_form_row_layout';

const ADVANCED_SETTINGS = {
  windows: AdvancedPolicySchema.filter((setting) => setting.key.startsWith('windows')),

  linux: AdvancedPolicySchema.filter((setting) => setting.key.startsWith('linux.')),

  macos: AdvancedPolicySchema.filter((setting) => setting.key.startsWith('mac')),
};

export interface PolicyFormAdvancedSettingsProps {
  policyDetails: PolicyData;
}

export const PolicyFormAdvancedSettings = memo<PolicyFormAdvancedSettingsProps>((props) => {
  const [showAdvancedPolicy, setShowAdvancedPolicy] = useState<boolean>(false);

  const handleAdvancedPolicyClick = useCallback(() => {
    setShowAdvancedPolicy((prevState) => !prevState);
  }, []);

  return (
    <>
      <EuiButtonEmpty data-test-subj="advancedPolicyButton" onClick={handleAdvancedPolicyClick}>
        {showAdvancedPolicy ? 'Hide advanced settings' : 'Show advanced settings'}
      </EuiButtonEmpty>

      {showAdvancedPolicy && (
        <>
          <EuiSpacer size="l" />

          <EuiCallOut title={'Proceed with caution!'} color="warning" iconType="warning">
            <p>
              {
                'This section contains policy values that support advanced use cases. If not configured properly, these values can cause unpredictable behavior. Please consult documentation carefully or contact support before editing these values.'
              }
            </p>
          </EuiCallOut>

          <EuiSpacer size="l" />

          <PolicyFormRowLayout
            label={<PolicyFormSectionTitle title={'Advanced Settings'} />}
            windows={<PlatformAdvancedOptions platformType="windows" />}
            linux={<PlatformAdvancedOptions platformType="linux" />}
            macos={<PlatformAdvancedOptions platformType="macos" />}
          />
        </>
      )}
    </>
  );
});
PolicyFormAdvancedSettings.displayName = 'PolicyFormAdvancedSettings';

interface PlatformAdvancedOptionsProps {
  platformType: 'linux' | 'windows' | 'macos';
}

const PlatformAdvancedOptions = memo<PlatformAdvancedOptionsProps>(({ platformType }) => {
  const settings = ADVANCED_SETTINGS[platformType];

  return (
    <>
      {settings.map(
        ({
          key,
          first_supported_version: firstSupportedVersion,
          last_supported_version: lastSupportedVersion,
          documentation,
        }) => {
          return (
            <PolicyAdvanced
              configPath={key.split('.')}
              documentation={documentation}
              firstSupportedVersion={firstSupportedVersion}
              lastSupportedVersion={lastSupportedVersion}
            />
          );
        }
      )}
    </>
  );
});
PlatformAdvancedOptions.displayName = 'PlatformAdvancedOptions';
