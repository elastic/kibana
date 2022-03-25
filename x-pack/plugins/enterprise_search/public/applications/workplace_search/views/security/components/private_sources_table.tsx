/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiTitle,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { LicensingLogic } from '../../../../shared/licensing';
import {
  REMOTE_SOURCES_TOGGLE_TEXT,
  REMOTE_SOURCES_TABLE_DESCRIPTION,
  REMOTE_SOURCES_EMPTY_TABLE_TITLE,
  STANDARD_SOURCES_TOGGLE_TEXT,
  STANDARD_SOURCES_TABLE_DESCRIPTION,
  STANDARD_SOURCES_EMPTY_TABLE_TITLE,
  SOURCE,
} from '../../../constants';
import { SecurityLogic, PrivateSourceSection } from '../security_logic';

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

  const tableClass = classNames({ 'euiTable--disabled': sectionDisabled });

  const emptyState = (
    <>
      <EuiSpacer />
      <EuiPanel hasShadow={false}>
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

  const sourcesTable = (
    <>
      <EuiSpacer />
      <EuiPanel hasShadow={false}>
        <EuiTable className={tableClass}>
          <EuiTableHeader>
            <EuiTableHeaderCell>{SOURCE}</EuiTableHeaderCell>
            <EuiTableHeaderCell />
          </EuiTableHeader>
          <EuiTableBody>
            {contentSources.map((source, i) => (
              <EuiTableRow key={i}>
                <EuiTableRowCell>{source.name}</EuiTableRowCell>
                <EuiTableRowCell align="right">
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
        <EuiTitle size="xxs">
          <h3>{isRemote ? REMOTE_SOURCES_TOGGLE_TEXT : STANDARD_SOURCES_TOGGLE_TEXT}</h3>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          {isRemote ? REMOTE_SOURCES_TABLE_DESCRIPTION : STANDARD_SOURCES_TABLE_DESCRIPTION}
        </EuiText>
        {!hasSources && emptyState}
        {hasSources && sourcesTable}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      color="subdued"
      className={classNames({
        'euiPanel--disabled': panelDisabled,
      })}
    >
      {sectionHeading}
    </EuiPanel>
  );
};
