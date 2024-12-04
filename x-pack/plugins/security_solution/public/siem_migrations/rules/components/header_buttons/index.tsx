/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';
import type { RuleMigrationTask } from '../../types';

export interface HeaderButtonsProps {
  /**
   * Available rule migrations stats
   */
  ruleMigrationsStats: RuleMigrationTask[];

  /**
   * Selected rule migration id
   */
  selectedMigrationId: string | undefined;

  /**
   * Handles migration selection changes
   * @param selectedId Selected migration id
   * @returns
   */
  onMigrationIdChange: (selectedId?: string) => void;
}

export const HeaderButtons: React.FC<HeaderButtonsProps> = React.memo(
  ({ ruleMigrationsStats, selectedMigrationId, onMigrationIdChange }) => {
    const migrationOptions = useMemo(() => {
      const options: Array<EuiComboBoxOptionOption<string>> = ruleMigrationsStats.map(
        ({ id, number }) => ({
          value: id,
          'data-test-subj': `migrationSelectionOption-${number}`,
          label: i18n.SIEM_MIGRATIONS_OPTION_LABEL(number),
        })
      );
      return options;
    }, [ruleMigrationsStats]);
    const selectedMigrationOption = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      const stats = ruleMigrationsStats.find(({ id }) => id === selectedMigrationId);
      return stats
        ? [
            {
              value: selectedMigrationId,
              'data-test-subj': `migrationSelectionOption-${stats.number}`,
              label: i18n.SIEM_MIGRATIONS_OPTION_LABEL(stats.number),
            },
          ]
        : [];
    }, [ruleMigrationsStats, selectedMigrationId]);

    const onChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onMigrationIdChange(selected[0].value);
    };

    if (!ruleMigrationsStats.length) {
      return null;
    }

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiComboBox
            aria-label={i18n.SIEM_MIGRATIONS_OPTION_AREAL_LABEL}
            onChange={onChange}
            options={migrationOptions}
            selectedOptions={selectedMigrationOption}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
HeaderButtons.displayName = 'HeaderButtons';
