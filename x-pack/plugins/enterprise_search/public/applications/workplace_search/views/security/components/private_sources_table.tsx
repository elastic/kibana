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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../shared/licensing';
import { SecurityLogic, PrivateSourceSection } from '../security_logic';
import {
  REMOTE_SOURCES_TOGGLE_TEXT,
  REMOTE_SOURCES_TABLE_DESCRIPTION,
  REMOTE_SOURCES_EMPTY_TABLE_TITLE,
  STANDARD_SOURCES_TOGGLE_TEXT,
  STANDARD_SOURCES_TABLE_DESCRIPTION,
  STANDARD_SOURCES_EMPTY_TABLE_TITLE,
  SOURCE,
} from '../../../constants';

interface PrivateSourcesTableProps {
  sourceType: 'remote' | 'standard';
  sourceSection: PrivateSourceSection;
  updateSource(sourceId: string, isEnabled: boolean): void;
  updateEnabled(isEnabled: boolean): void;
}

const REMOTE_SOURCES_EMPTY_TABLE_DESCRIPTION = (
  <FormattedMessage
    id="xpack.enterpriseSearch.workplaceSearch.security.remoteSourcesEmptyTable.description"
    defaultMessage="Once configured, remote private sources are {enabledStrong}, and users can immediately connect the source from their Personal Dashboard."
    values={{
      enabledStrong: (
        <strong>
          {i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.security.remoteSourcesEmptyTable.enabledStrong',
            { defaultMessage: 'enabled by default' }
          )}
        </strong>
      ),
    }}
  />
);

const STANDARD_SOURCES_EMPTY_TABLE_DESCRIPTION = (
  <FormattedMessage
    id="xpack.enterpriseSearch.workplaceSearch.security.standardSourcesEmptyTable.description"
    defaultMessage="Once configured, standard private sources are {notEnabledStrong}, and must be activated before users are allowed to connect the source from their Personal Dashboard."
    values={{
      notEnabledStrong: (
        <strong>
          {i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.security.standardSourcesEmptyTable.notEnabledStrong',
            { defaultMessage: 'not enabled by default' }
          )}
        </strong>
      ),
    }}
  />
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
          <strong>
            {isRemote ? REMOTE_SOURCES_EMPTY_TABLE_TITLE : STANDARD_SOURCES_EMPTY_TABLE_TITLE}
          </strong>
        </EuiText>
        <EuiText textAlign="center" color="subdued" size="s">
          {isRemote
            ? REMOTE_SOURCES_EMPTY_TABLE_DESCRIPTION
            : STANDARD_SOURCES_EMPTY_TABLE_DESCRIPTION}
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
          <h4>{isRemote ? REMOTE_SOURCES_TOGGLE_TEXT : STANDARD_SOURCES_TOGGLE_TEXT}</h4>
        </EuiText>
        <EuiText color="subdued" size="s">
          {isRemote ? REMOTE_SOURCES_TABLE_DESCRIPTION : STANDARD_SOURCES_TABLE_DESCRIPTION}
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
          <EuiTableHeaderCell>{SOURCE}</EuiTableHeaderCell>
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
