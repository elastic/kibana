/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer,
} from '@elastic/eui';

import { LicensingLogic } from '../../../../shared/licensing';
import { SecurityLogic, PrivateSourceSection } from '../security_logic';

interface PrivateSourcesTableProps {
  sourceType: 'remote' | 'standard';
  sourceSection: PrivateSourceSection;
  updateSource(sourceId: string, isEnabled: boolean): void;
  updateEnabled(isEnabled: boolean): void;
}

const REMOTE_TABLE_SUBHEAD =
  'Remote sources synchronize and store a limited amount of data on disk, with a low impact on storage resources.';
const STANDARD_TABLE_SUBHEAD =
  'Standard sources synchronize and store all searchable data on disk, with a directly correlated impact on storage resources.';
const REMOTE_EMPTY_SUBHEAD = (
  <>
    Once configured, remote private sources are <strong>enabled by default</strong>, and users can
    immediately connect the source from their Personal Dashboard.
  </>
);
const STANDARD_EMPTY_SUBHEAD = (
  <>
    Once configured, standard private sources <strong>are not enabled by default</strong>, and must
    be activated before users are allowed to connect the source from their Personal Dashboard.
  </>
);

export const PrivateSourcesTable: React.FC<PrivateSourcesTableProps> = ({
  sourceType,
  sourceSection: { isEnabled: sectionEnabled, contentSources },
  updateSource,
  updateEnabled,
}) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { isEnabled } = useValues(SecurityLogic);

  const isRemote = sourceType === 'remote';
  const hasSources = contentSources.length > 0;
  const panelDisabled = !isEnabled || !hasPlatinumLicense;
  const sectionDisabled = !sectionEnabled;

  const panelClass = classNames('euiPanel--outline euiPanel--noShadow', {
    'euiPanel--disabled': panelDisabled,
  });

  const tableClass = classNames({ 'euiTable--disabled': sectionDisabled });

  const emptyState = (
    <>
      <EuiSpacer />
      <EuiPanel className="euiPanel--inset euiPanel--noShadow euiPanel--outline">
        <EuiText textAlign="center" color="subdued" size="s">
          <strong>No {sourceType} private sources configured yet</strong>
        </EuiText>
        <EuiText textAlign="center" color="subdued" size="s">
          {isRemote ? REMOTE_EMPTY_SUBHEAD : STANDARD_EMPTY_SUBHEAD}
        </EuiText>
      </EuiPanel>
    </>
  );

  const sectionHeading = (
    <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <EuiSwitch
          checked={sectionEnabled}
          onChange={(e) => updateEnabled(e.target.checked)}
          disabled={!isEnabled || !hasPlatinumLicense}
          showLabel={false}
          label={`${sourceType} Sources Toggle`}
          data-test-subj={`${sourceType}EnabledToggle`}
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <h4>Enable {sourceType} private sources</h4>
        </EuiText>
        <EuiText color="subdued" size="s">
          {isRemote ? REMOTE_TABLE_SUBHEAD : STANDARD_TABLE_SUBHEAD}
        </EuiText>
        {!hasSources && emptyState}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const sourcesTable = (
    <>
      <EuiSpacer />
      <EuiTable className={tableClass}>
        <EuiTableHeader>
          <EuiTableHeaderCell>Source</EuiTableHeaderCell>
          <EuiTableHeaderCell />
        </EuiTableHeader>
        <EuiTableBody>
          {contentSources.map((source, i) => (
            <EuiTableRow key={i}>
              <EuiTableRowCell>{source.name}</EuiTableRowCell>
              <EuiTableRowCell>
                <EuiSwitch
                  checked={!!source.isEnabled}
                  disabled={sectionDisabled}
                  onChange={(e) => updateSource(source.id, e.target.checked)}
                  showLabel={false}
                  label={`${source.name} Toggle`}
                  data-test-subj={`${sourceType}SourceToggle`}
                  compressed
                />
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    </>
  );

  return (
    <EuiPanel className={panelClass}>
      {sectionHeading}
      {hasSources && sourcesTable}
    </EuiPanel>
  );
};
