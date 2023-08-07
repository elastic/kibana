/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetProtectionsUnavailableComponent } from './hooks/use_get_protections_unavailable_component';
import { AntivirusRegistrationCard } from './components/cards/antivirus_registration_card';
import { LinuxEventCollectionCard } from './components/cards/linux_event_collection_card';
import { MacEventCollectionCard } from './components/cards/mac_event_collection_card';
import { WindowsEventCollectionCard } from './components/cards/windows_event_collection_card';
import { AttackSurfaceReductionCard } from './components/cards/attack_surface_reduction_card';
import { BehaviourProtectionCard } from './components/cards/protection_seetings_card/behaviour_protection_card';
import { MemoryProtectionCard } from './components/cards/memory_protection_card';
import { RansomwareProtectionCard } from './components/cards/ransomware_protection_card';
import { MalwareProtectionsCard } from './components/cards/malware_protections_card';
import type { PolicyFormComponentCommonProps } from './types';
import { AdvancedSection } from './components/advanced_section';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';

const PROTECTIONS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.protections',
  { defaultMessage: 'Protections' }
);

const SETTINGS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.settings',
  { defaultMessage: 'Settings' }
);

export type PolicySettingsFormProps = PolicyFormComponentCommonProps;

export const PolicySettingsForm = memo<PolicySettingsFormProps>((props) => {
  const getTestId = useTestIdGenerator(props['data-test-subj']);
  const ProtectionsUpSellingComponent = useGetProtectionsUnavailableComponent();

  return (
    <div data-test-subj={getTestId()}>
      <FormSectionTitle>{PROTECTIONS_SECTION_TITLE}</FormSectionTitle>
      <EuiSpacer size="s" />

      {ProtectionsUpSellingComponent && (
        <>
          <EuiSpacer size="m" />
          <ProtectionsUpSellingComponent />
          <EuiSpacer size="l" />
        </>
      )}

      {!ProtectionsUpSellingComponent && (
        <>
          <MalwareProtectionsCard {...props} data-test-subj={getTestId('malware')} />
          <EuiSpacer size="l" />

          <RansomwareProtectionCard {...props} data-test-subj={getTestId('ransomware')} />
          <EuiSpacer size="l" />

          <MemoryProtectionCard {...props} data-test-subj={getTestId('memory')} />
          <EuiSpacer size="l" />

          <BehaviourProtectionCard {...props} data-test-subj={getTestId('behaviour')} />
          <EuiSpacer size="l" />

          <AttackSurfaceReductionCard {...props} data-test-subj={getTestId('attackSurface')} />
          <EuiSpacer size="l" />
        </>
      )}

      <FormSectionTitle>{SETTINGS_SECTION_TITLE}</FormSectionTitle>
      <EuiSpacer size="s" />

      <WindowsEventCollectionCard {...props} data-test-subj={getTestId('windowsEvents')} />
      <EuiSpacer size="l" />

      <MacEventCollectionCard {...props} data-test-subj={getTestId('macEvents')} />
      <EuiSpacer size="l" />

      <LinuxEventCollectionCard {...props} data-test-subj={getTestId('linuxEvents')} />
      <EuiSpacer size="l" />

      <AntivirusRegistrationCard {...props} data-test-subj={getTestId('antivirusRegistration')} />

      <EuiSpacer size="m" />
      <AdvancedSection {...props} data-test-subj={getTestId('advancedSection')} />
    </div>
  );
});
PolicySettingsForm.displayName = 'PolicySettingsForm';

const FormSectionTitle = memo(({ children }) => {
  return (
    <EuiText size="xs" color="subdued">
      <h4>{children}</h4>
    </EuiText>
  );
});
FormSectionTitle.displayName = 'FormSectionTitle';
