/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

import { ContentSection } from '../../../components/shared/content_section';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { SettingsLogic } from '../settings_logic';

export const Customize: React.FC = () => {
  const { onOrgNameInputChange, updateOrgName } = useActions(SettingsLogic);
  const { orgNameInputValue } = useValues(SettingsLogic);

  const handleSubmit = (e: FormEvent) => {
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
    </form>
  );
};
