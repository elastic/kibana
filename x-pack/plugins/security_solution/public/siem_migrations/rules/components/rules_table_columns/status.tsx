/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { StatusBadge } from '../status_badge';

export const createStatusColumn = (): TableColumn => {
  return {
    field: 'translation_result',
    name: i18n.COLUMN_STATUS,
    render: (_, rule: RuleMigration) => <StatusBadge migrationRule={rule} />,
    sortable: true,
    truncateText: true,
    width: '15%',
  };
};
