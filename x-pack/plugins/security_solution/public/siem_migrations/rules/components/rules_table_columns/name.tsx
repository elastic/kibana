/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';

interface NameProps {
  name: string;
  rule: RuleMigration;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
}

const Name = ({ name, rule, openMigrationRuleDetails }: NameProps) => {
  return (
    <EuiLink
      onClick={() => {
        openMigrationRuleDetails(rule);
      }}
      data-test-subj="ruleName"
    >
      {name}
    </EuiLink>
  );
};

export const createNameColumn = ({
  openMigrationRuleDetails,
}: {
  openMigrationRuleDetails: (rule: RuleMigration) => void;
}): TableColumn => {
  return {
    field: 'original_rule.title',
    name: i18n.COLUMN_NAME,
    render: (value: RuleMigration['original_rule']['title'], rule: RuleMigration) => (
      <Name name={value} rule={rule} openMigrationRuleDetails={openMigrationRuleDetails} />
    ),
    sortable: true,
    truncateText: true,
    width: '40%',
    align: 'left',
  };
};
