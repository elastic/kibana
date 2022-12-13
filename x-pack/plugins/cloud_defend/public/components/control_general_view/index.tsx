/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import yaml from 'js-yaml';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { getInputFromPolicy } from '../../common/utils';
import type { SettingsDeps } from '../../types';
import * as i18n from './translations';

export const ControlGeneralView = ({ policy, onChange }: SettingsDeps) => {
  const styles = useStyles();
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const json = useMemo(() => {
    try {
      return yaml.load(configuration);
    } catch {
      return { selectors: [], responses: [] };
    }
  }, [configuration]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
