/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import type { TranslatedRuleMigration } from '../../types';

const Author = ({ isPrebuiltRule }: { isPrebuiltRule: boolean }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {isPrebuiltRule && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoElastic" size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {isPrebuiltRule ? i18n.ELASTIC_AUTHOR_TITLE : i18n.CUSTOM_AUTHOR_TITLE}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createAuthorColumn = (): TableColumn => {
  return {
    field: 'elastic_rule.prebuilt_rule_id',
    name: i18n.COLUMN_AUTHOR,
    render: (value: TranslatedRuleMigration['elastic_rule']['prebuilt_rule_id']) => {
      return <Author isPrebuiltRule={!!value} />;
    },
    sortable: true,
    width: '10%',
  };
};
