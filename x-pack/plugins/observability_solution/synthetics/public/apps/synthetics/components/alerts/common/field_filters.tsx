/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { StatusRuleParamsProps } from '../status_rule_ui';
import { LocationsField, MonitorField, MonitorTypeField, TagsField } from './fields';

type FieldKeys = 'monitorIds' | 'projects' | 'tags' | 'locations' | 'monitorTypes';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const FieldFilters = ({ ruleParams, setRuleParams }: Props) => {
  const onFieldChange = useCallback(
    (key: FieldKeys, value?: string[]) => {
      setRuleParams(key, value);
    },
    [setRuleParams]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <MonitorField
            onChange={(val) => {
              onFieldChange('monitorIds', val);
            }}
            value={ruleParams.monitorIds}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MonitorTypeField
            onChange={(val) => {
              onFieldChange('monitorTypes', val);
            }}
            value={ruleParams.monitorTypes}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <TagsField
            onChange={(val) => {
              onFieldChange('tags', val);
            }}
            value={ruleParams.tags}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <LocationsField
            onChange={(val) => {
              onFieldChange('locations', val);
            }}
            value={ruleParams.locations}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
