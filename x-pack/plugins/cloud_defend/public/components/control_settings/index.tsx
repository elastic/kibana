/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import * as i18n from './translations';
import { ControlGeneralView } from '../control_general_view';
import { ControlYamlView } from '../control_yaml_view';
import { SettingsDeps, OnChangeDeps } from '../../types';

const VIEW_MODE_GENERAL = 'general';
const VIEW_MODE_YAML = 'yaml';

export const ControlSettings = ({ policy, onChange }: SettingsDeps) => {
  const [viewMode, setViewMode] = useState(VIEW_MODE_GENERAL);
  const [isValid, setIsValid] = useState(true);

  const onViewModeGeneral = useCallback(() => {
    setViewMode(VIEW_MODE_GENERAL);
  }, []);

  const onViewModeYaml = useCallback(() => {
    setViewMode(VIEW_MODE_YAML);
  }, []);

  const isGeneralViewSelected = viewMode === VIEW_MODE_GENERAL;
  const isYamlViewSelected = viewMode === VIEW_MODE_YAML;

  const onChanges = useCallback(
    (opts: OnChangeDeps) => {
      opts.updatedPolicy = policy;
      onChange(opts);
      setIsValid(opts.isValid);
    },
    [onChange, policy]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTabs>
          <EuiTab
            id={VIEW_MODE_GENERAL}
            onClick={onViewModeGeneral}
            isSelected={isGeneralViewSelected}
            data-test-subj="cloud-defend-btngeneralview"
            disabled={!isValid}
          >
            {i18n.viewModeGeneral}
          </EuiTab>
          <EuiTab
            id={VIEW_MODE_YAML}
            onClick={onViewModeYaml}
            isSelected={isYamlViewSelected}
            data-test-subj="cloud-defend-btnyamlview"
            disabled={!isValid}
          >
            {i18n.viewModeYaml}
          </EuiTab>
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem>
        {/** general view removed from DOM for performance and to avoid errors when invalid yaml is passed to it**/}
        {isGeneralViewSelected && (
          <ControlGeneralView show={isGeneralViewSelected} policy={policy} onChange={onChanges} />
        )}
        {/** yaml view is kept in the dom at all times to prevent some sizing/rendering issues **/}
        <ControlYamlView show={isYamlViewSelected} policy={policy} onChange={onChanges} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
