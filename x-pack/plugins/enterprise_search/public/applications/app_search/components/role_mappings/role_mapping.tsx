/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { AttributeSelector, RoleSelector } from '../../../shared/role_mapping';
import {
  SAVE_ROLE_MAPPING,
  UPDATE_ROLE_MAPPING,
  ROLE_MAPPINGS_TITLE,
  ADD_ROLE_MAPPING_TITLE,
  MANAGE_ROLE_MAPPING_TITLE,
} from '../../../shared/role_mapping/constants';
import { AppLogic } from '../../app_logic';
import { AdvanceRoleType } from '../../types';

import { roleHasScopedEngines } from '../../utils/role/has_scoped_engines';
import { Engine } from '../engine/types';

import {
  ADVANCED_ROLE_TYPES,
  STANDARD_ROLE_TYPES,
  ROLE_TITLE,
  FULL_ENGINE_ACCESS_TITLE,
  FULL_ENGINE_ACCESS_DESCRIPTION,
  LIMITED_ENGINE_ACCESS_TITLE,
  LIMITED_ENGINE_ACCESS_DESCRIPTION,
  ENGINE_ACCESS_TITLE,
} from './constants';
import { RoleMappingsLogic } from './role_mappings_logic';

export const RoleMapping: React.FC = () => {
  const { myRole } = useValues(AppLogic);

  const {
    handleAccessAllEnginesChange,
    handleAttributeSelectorChange,
    handleAttributeValueChange,
    handleAuthProviderChange,
    handleEngineSelectionChange,
    handleRoleChange,
    handleSaveMapping,
  } = useActions(RoleMappingsLogic);

  const {
    accessAllEngines,
    attributeName,
    attributeValue,
    attributes,
    availableAuthProviders,
    availableEngines,
    elasticsearchRoles,
    hasAdvancedRoles,
    multipleAuthProvidersConfig,
    roleMapping,
    roleType,
    selectedEngines,
    selectedAuthProviders,
  } = useValues(RoleMappingsLogic);

  const isNew = !roleMapping;

  const SAVE_ROLE_MAPPING_LABEL = isNew ? SAVE_ROLE_MAPPING : UPDATE_ROLE_MAPPING;
  const TITLE = isNew ? ADD_ROLE_MAPPING_TITLE : MANAGE_ROLE_MAPPING_TITLE;

  const mapRoleOptions = ({ id, description }: AdvanceRoleType) => ({
    id,
    description,
    disabled: !myRole.availableRoleTypes.includes(id),
  });

  const standardRoleOptions = STANDARD_ROLE_TYPES.map(mapRoleOptions);
  const advancedRoleOptions = ADVANCED_ROLE_TYPES.map(mapRoleOptions);

  const roleOptions = hasAdvancedRoles
    ? [...standardRoleOptions, ...advancedRoleOptions]
    : standardRoleOptions;

  const saveRoleMappingButton = (
    <EuiButton onClick={handleSaveMapping} fill data-test-subj="SaveRoleMappingButton">
      {SAVE_ROLE_MAPPING_LABEL}
    </EuiButton>
  );

  const engineSelector = (engine: Engine) => (
    <EuiCheckbox
      key={engine.name}
      name={engine.name}
      id={`engine_option_${engine.name}`}
      checked={selectedEngines.has(engine.name)}
      onChange={(e) => {
        handleEngineSelectionChange(engine.name, e.target.checked);
      }}
      label={engine.name}
    />
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE, TITLE]} />
      <EuiPageHeader rightSideItems={[saveRoleMappingButton]} pageTitle={TITLE} />
      <EuiSpacer />
      <EuiPageContentBody>
        <FlashMessages />
        <AttributeSelector
          attributeName={attributeName}
          attributeValue={attributeValue}
          attributes={attributes}
          availableAuthProviders={availableAuthProviders}
          elasticsearchRoles={elasticsearchRoles}
          selectedAuthProviders={selectedAuthProviders}
          disabled={!!roleMapping}
          handleAttributeSelectorChange={handleAttributeSelectorChange}
          handleAttributeValueChange={handleAttributeValueChange}
          handleAuthProviderChange={handleAuthProviderChange}
          multipleAuthProvidersConfig={multipleAuthProvidersConfig}
        />
        <EuiSpacer />
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiPanel hasShadow={false} color="subdued" paddingSize="l">
              <EuiTitle size="s">
                <h3>{ROLE_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer />
              <EuiTitle size="xs">
                <h4>{FULL_ENGINE_ACCESS_TITLE}</h4>
              </EuiTitle>
              <EuiSpacer />
              <RoleSelector
                roleType={roleType}
                roleOptions={roleOptions}
                onChange={handleRoleChange}
                label="Role"
              />
            </EuiPanel>
          </EuiFlexItem>
          {hasAdvancedRoles && (
            <EuiFlexItem>
              <EuiPanel hasShadow={false} color="subdued" paddingSize="l">
                <EuiTitle size="s">
                  <h3>{ENGINE_ACCESS_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer />
                <EuiFormRow>
                  <EuiRadio
                    id="accessAllEngines"
                    disabled={!roleHasScopedEngines(roleType)}
                    checked={accessAllEngines}
                    onChange={handleAccessAllEnginesChange}
                    label={
                      <>
                        <EuiTitle size="xs">
                          <h4>{FULL_ENGINE_ACCESS_TITLE}</h4>
                        </EuiTitle>
                        <p>{FULL_ENGINE_ACCESS_DESCRIPTION}</p>
                      </>
                    }
                  />
                </EuiFormRow>
                <EuiFormRow>
                  <>
                    <EuiRadio
                      id="selectEngines"
                      disabled={!roleHasScopedEngines(roleType)}
                      checked={!accessAllEngines}
                      onChange={handleAccessAllEnginesChange}
                      label={
                        <>
                          <EuiTitle size="xs">
                            <h4>{LIMITED_ENGINE_ACCESS_TITLE}</h4>
                          </EuiTitle>
                          <p>{LIMITED_ENGINE_ACCESS_DESCRIPTION}</p>
                        </>
                      }
                    />
                    {!accessAllEngines && (
                      <div className="engines-list">
                        {availableEngines.map((engine) => engineSelector(engine))}
                      </div>
                    )}
                  </>
                </EuiFormRow>
              </EuiPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
