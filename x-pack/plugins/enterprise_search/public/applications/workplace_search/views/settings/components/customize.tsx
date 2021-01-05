/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

import TelemetryPanel from 'shared/components/TelemetryPanel';
import { ContentSection } from '../../../components/shared/content_section';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { AppLogic } from '../../../app_logic';
import { SettingsLogic } from '../settings_logic';

export const Customize: React.FC = () => {
  const { onOrgNameInputChange, updateOrgName, toggleTelemetryOptIn } = useActions(SettingsLogic);
  const { orgNameInputValue, telemetryOptedInUpdating } = useValues(SettingsLogic);

  const {
    telemetryStatus: { telemetryOptedIn },
  } = useValues(AppLogic);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateOrgName();
  };

  return (
    <form onSubmit={handleSubmit}>
      <ViewContentHeader
        title="Customize Workplace Search"
        description="Personalize general organization settings."
      />
      <ContentSection>
        <EuiFormRow label="Organization name" fullWidth isInvalid={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFieldText
                isInvalid={false}
                required
                value={orgNameInputValue}
                data-test-subj="OrgNameInput"
                onChange={(e) => onOrgNameInputChange(e.target.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow>
          <EuiButton color="primary" data-test-subj="SaveOrgNameButton" type="submit">
            Save organization name
          </EuiButton>
        </EuiFormRow>
      </ContentSection>
      <ContentSection>
        <TelemetryPanel
          telemetryOptedIn={!!telemetryOptedIn}
          telemetryOptedInUpdating={!!telemetryOptedInUpdating}
          toggleTelemetryOptIn={toggleTelemetryOptIn}
        />
      </ContentSection>
    </form>
  );
};
