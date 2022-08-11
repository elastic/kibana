/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { EuiCheckboxGroupIdToSelectedMap } from '@elastic/eui/src/components/form/checkbox/checkbox_group';

import { Loading } from '../../../../../shared/loading';

import { AddSourceLogic } from './add_source_logic';
import { CONFIG_OAUTH_LABEL, CONFIG_OAUTH_BUTTON } from './constants';

interface ConfigureOauthProps {
  header: React.ReactNode;
  name: string;
  onFormCreated(name: string): void;
}

export const ConfigureOauth: React.FC<ConfigureOauthProps> = ({ name, onFormCreated, header }) => {
  const [formLoading, setFormLoading] = useState(false);

  const { getPreContentSourceConfigData, setSelectedGithubOrganizations, createContentSource } =
    useActions(AddSourceLogic);
  const { githubOrganizations, selectedGithubOrganizationsMap, sectionLoading } =
    useValues(AddSourceLogic);

  const checkboxOptions = githubOrganizations.map((item) => ({ id: item, label: item }));

  useEffect(() => {
    getPreContentSourceConfigData();
  }, []);

  const handleChange = (option: string) => setSelectedGithubOrganizations(option);
  const formSubmitSuccess = () => onFormCreated(name);
  const handleFormSubmitError = () => setFormLoading(false);
  const handleFormSubmit = (e: FormEvent) => {
    setFormLoading(true);
    e.preventDefault();
    createContentSource(formSubmitSuccess, handleFormSubmitError);
  };

  const configfieldsForm = (
    <form onSubmit={handleFormSubmit}>
      <EuiFlexGroup
        direction="row"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="xl"
        responsive={false}
      >
        <EuiFlexItem grow={1} className="adding-a-source__connect-an-instance">
          <EuiFormRow label={CONFIG_OAUTH_LABEL}>
            <EuiCheckboxGroup
              options={checkboxOptions}
              idToSelectedMap={selectedGithubOrganizationsMap as EuiCheckboxGroupIdToSelectedMap}
              onChange={handleChange}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiFormRow>
            <EuiButton isLoading={formLoading} color="primary" fill type="submit">
              {CONFIG_OAUTH_BUTTON}
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );

  return (
    <>
      {header}
      <EuiSpacer />
      {sectionLoading ? <Loading /> : configfieldsForm}
    </>
  );
};
