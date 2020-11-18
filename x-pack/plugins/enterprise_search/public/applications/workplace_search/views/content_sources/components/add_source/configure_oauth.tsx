/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { Location } from 'history';
import { useActions, useValues } from 'kea';
import { useLocation } from 'react-router-dom';

import {
  EuiButton,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import { parseQueryParams } from '../../../../../../applications/shared/query_params';
import { Loading } from '../../../../../../applications/shared/loading';
import { SourceLogic } from '../../source_logic';

interface OauthQueryParams {
  preContentSourceId: string;
}

interface ConfigureOauthProps {
  header: React.ReactNode;
  name: string;
  onFormCreated(name: string);
}

export const ConfigureOauth: React.FC<ConfigureOauthProps> = ({ name, onFormCreated, header }) => {
  const { search } = useLocation() as Location;

  const { preContentSourceId } = (parseQueryParams(search) as unknown) as OauthQueryParams;
  const [formLoading, setFormLoading] = useState(false);

  const {
    getPreContentSourceConfigData,
    setSelectedGithubOrganizations,
    createContentSource,
  } = useActions(SourceLogic);
  const {
    currentServiceType,
    githubOrganizations,
    selectedGithubOrganizationsMap,
    sectionLoading,
  } = useValues(SourceLogic);

  const checkboxOptions = githubOrganizations.map((item) => ({ id: item, label: item }));

  useEffect(() => {
    getPreContentSourceConfigData(preContentSourceId);
  }, []);

  const handleChange = (option) => setSelectedGithubOrganizations(option);
  const formSubmitSuccess = () => onFormCreated(name);
  const handleFormSubmitError = () => setFormLoading(false);
  const handleFormSubmut = (e) => {
    setFormLoading(true);
    e.preventDefault();
    createContentSource(currentServiceType, formSubmitSuccess, handleFormSubmitError);
  };

  const configfieldsForm = (
    <form onSubmit={handleFormSubmut}>
      <EuiFlexGroup
        direction="row"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="xl"
        responsive={false}
      >
        <EuiFlexItem grow={1} className="adding-a-source__connect-an-instance">
          <EuiFormRow label="Select GitHub organizations to sync">
            <EuiCheckboxGroup
              options={checkboxOptions}
              idToSelectedMap={selectedGithubOrganizationsMap}
              onChange={handleChange}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiFormRow>
            <EuiButton isLoading={formLoading} color="primary" fill type="submit">
              Complete connection
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );

  return (
    <div className="step-4">
      {header}
      {sectionLoading ? <Loading /> : configfieldsForm}
    </div>
  );
};
