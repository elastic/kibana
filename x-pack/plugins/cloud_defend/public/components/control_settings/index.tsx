/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import * as i18n from './translations';
import { ControlGeneralView } from '../control_general_view';
import { ControlYamlView } from '../control_yaml_view';

const VIEW_MODE_GENERAL = 'general';
const VIEW_MODE_YAML = 'yaml';

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

interface ControlSettingsDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

export const ControlSettings = ({ policy, onChange }: ControlSettingsDeps) => {
  const [viewMode, setViewMode] = useState(VIEW_MODE_GENERAL);

  const onViewModeGeneral = useCallback(() => {
    setViewMode(VIEW_MODE_GENERAL);
  }, []);

  const onViewModeYaml = useCallback(() => {
    setViewMode(VIEW_MODE_YAML);
  }, []);

  const isGeneralViewSelected = viewMode === VIEW_MODE_GENERAL;
  const isYamlViewSelected = viewMode === VIEW_MODE_YAML;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTabs>
          <EuiTab
            id={VIEW_MODE_GENERAL}
            onClick={onViewModeGeneral}
            isSelected={isGeneralViewSelected}
            data-test-subj="cloud-defend-btngeneralview"
          >
            {i18n.viewModeGeneral}
          </EuiTab>
          <EuiTab
            id={VIEW_MODE_YAML}
            onClick={onViewModeYaml}
            isSelected={isYamlViewSelected}
            data-test-subj="cloud-defend-btnyamlview"
          >
            {i18n.viewModeYaml}
          </EuiTab>
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem>
        {isGeneralViewSelected && <ControlGeneralView policy={policy} onChange={onChange} />}
        {isYamlViewSelected && <ControlYamlView policy={policy} onChange={onChange} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
