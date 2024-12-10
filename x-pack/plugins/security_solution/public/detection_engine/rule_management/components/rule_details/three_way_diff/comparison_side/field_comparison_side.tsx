/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { VersionsPicker } from './versions_picker/versions_picker';
import type { Version, SelectedVersions } from './versions_picker/constants';
import { getOptionsForDiffOutcome } from './versions_picker/constants';
import { FieldUpgradeSideHeader } from '../field_upgrade_side_header';
import { useFieldUpgradeContext } from '../rule_upgrade/field_upgrade_context';
import { pickFieldValueForVersion } from './utils';
import { getSubfieldChanges } from './get_subfield_changes';
import { SubfieldChanges } from './subfield_changes';
import { ComparisonSideHelpInfo } from './comparison_side_help_info';
import * as i18n from './translations';

export function FieldComparisonSide(): JSX.Element {
  const { fieldName, fieldDiff, finalDiffableRule } = useFieldUpgradeContext();
  const resolvedValue = finalDiffableRule[fieldName];

  const options = getOptionsForDiffOutcome(fieldDiff, resolvedValue);
  const [selectedVersions, setSelectedVersions] = useState<SelectedVersions>(options[0].value);

  const [oldVersionType, newVersionType] = selectedVersions.split('_') as [Version, Version];

  const oldFieldValue = pickFieldValueForVersion(oldVersionType, fieldDiff, resolvedValue);

  const newFieldValue = pickFieldValueForVersion(newVersionType, fieldDiff, resolvedValue);

  const subfieldChanges = getSubfieldChanges(fieldName, oldFieldValue, newFieldValue);

  return (
    <>
      <FieldUpgradeSideHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>
                {i18n.TITLE}
                <ComparisonSideHelpInfo options={options} />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <VersionsPicker
              options={options}
              selectedVersions={selectedVersions}
              onChange={setSelectedVersions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FieldUpgradeSideHeader>
      <SubfieldChanges fieldName={fieldName} subfieldChanges={subfieldChanges} />
    </>
  );
}
