/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRange,
  EuiPanel,
  EuiSpacer,
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';
import { _SingleRangeChangeEvent } from '@elastic/eui/src/components/form/range/types';
import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL } from '../../../../shared/constants';
import { WorkplaceSearchPageTemplate } from '../../../components/layout';
import { SourceIcon } from '../../../components/shared/source_icon';
import { NAV } from '../../../constants';
import { ContentSource } from '../../../types';
import { GroupLogic } from '../group_logic';

const HEADER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.headerTitle',
  {
    defaultMessage: 'Organizational content source prioritization',
  }
);
const HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.headerDescription',
  {
    defaultMessage: 'Calibrate relative document importance across group content sources.',
  }
);
const ZERO_STATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.zeroStateTitle',
  {
    defaultMessage: 'No sources are shared with this group',
  }
);
const ZERO_STATE_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.zeroStateButtonText',
  {
    defaultMessage: 'Add organizational content sources',
  }
);
const SOURCE_TABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.sourceTableHeader',
  {
    defaultMessage: 'Source',
  }
);
const PRIORITY_TABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.priorityTableHeader',
  {
    defaultMessage: 'Relevance Priority',
  }
);

export const GroupSourcePrioritization: React.FC = () => {
  const { updatePriority, saveGroupSourcePrioritization, showOrgSourcesModal } =
    useActions(GroupLogic);

  const {
    group: { contentSources = [], name: groupName },
    dataLoading,
    activeSourcePriorities,
    groupPrioritiesUnchanged,
  } = useValues(GroupLogic);

  const headerAction = (
    <EuiButton
      disabled={groupPrioritiesUnchanged}
      color="primary"
      fill
      onClick={saveGroupSourcePrioritization}
    >
      {SAVE_BUTTON_LABEL}
    </EuiButton>
  );
  const handleSliderChange = (id: string, e: _SingleRangeChangeEvent) =>
    updatePriority(id, Number(e.currentTarget.value));
  const hasSources = contentSources.length > 0;

  const zeroState = (
    <EuiPanel paddingSize="none">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt
        iconType="advancedSettingsApp"
        iconColor="subdued"
        titleSize="s"
        title={<h3>{ZERO_STATE_TITLE}</h3>}
        body={
          <>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.zeroStateBody',
              {
                defaultMessage:
                  'Share two or more sources with {groupName} to customize source prioritization.',
                values: { groupName },
              }
            )}
          </>
        }
        actions={<EuiButton onClick={showOrgSourcesModal}>{ZERO_STATE_BUTTON_TEXT}</EuiButton>}
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );

  const sourceTable = (
    <EuiTable responsiveBreakpoint={false} tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{SOURCE_TABLE_HEADER}</EuiTableHeaderCell>
        <EuiTableHeaderCell align="right">{PRIORITY_TABLE_HEADER}</EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        {contentSources.map(({ id, name, serviceType }: ContentSource) => (
          <EuiTableRow key={id} data-test-subj="GroupsRow">
            <EuiTableRowCell>
              <EuiFlexGroup justifyContent="flexStart" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <SourceIcon serviceType={serviceType} name={name} />
                </EuiFlexItem>
                <EuiFlexItem>{name}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiTableRowCell>
            <EuiTableRowCell align="right">
              <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiRange
                    id={id}
                    min={1}
                    max={10}
                    step={1}
                    showInput
                    value={activeSourcePriorities[id]}
                    onChange={(e) => handleSliderChange(id, e)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.GROUPS, groupName || '...', NAV.SOURCE_PRIORITIZATION]}
      pageViewTelemetry="group_overview"
      pageHeader={{
        pageTitle: HEADER_TITLE,
        description: HEADER_DESCRIPTION,
        rightSideItems: [headerAction],
      }}
      isLoading={dataLoading}
    >
      {hasSources ? sourceTable : zeroState}
    </WorkplaceSearchPageTemplate>
  );
};
