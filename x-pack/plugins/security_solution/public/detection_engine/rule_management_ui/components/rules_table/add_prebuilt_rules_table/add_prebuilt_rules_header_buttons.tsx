/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';

export const AddPrebuiltRulesHeaderButtons = () => {
  const {
    state: { selectedRules },
    actions: { installAllRules },
  } = useAddPrebuiltRulesTableContext();

  const installRules = useCallback(() => {
    installAllRules();
  }, [installAllRules]);

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayInstallSelectedRulesButton = numberOfSelectedRules > 0;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayInstallSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiButton>{i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}</EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton fill iconType="plusInCircle" onClick={installRules}>
          {i18n.INSTALL_ALL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
