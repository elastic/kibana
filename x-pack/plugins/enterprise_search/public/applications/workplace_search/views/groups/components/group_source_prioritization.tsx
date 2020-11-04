/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, MouseEvent } from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

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

import { Loading } from '../../../components/shared/loading';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { SourceIcon } from '../../../components/shared/source_icon';

import { GroupLogic } from '../group_logic';

import { IContentSource } from '../../../types';

const HEADER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.headerTitle',
  {
    defaultMessage: 'Shared content source prioritization',
  }
);
const HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.headerDescription',
  {
    defaultMessage: 'Calibrate relative document importance across group content sources.',
  }
);
const HEADER_ACTION_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourceProioritization.headerActionText',
  {
    defaultMessage: 'Save',
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
    defaultMessage: 'Add shared content sources',
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
  const { updatePriority, saveGroupSourcePrioritization, showSharedSourcesModal } = useActions(
    GroupLogic
  );

  const {
    group: { contentSources, name: groupName },
    dataLoading,
    activeSourcePriorities,
    groupPrioritiesUnchanged,
  } = useValues(GroupLogic);

  if (dataLoading) return <Loading />;

  const headerAction = (
    <EuiButton
      disabled={groupPrioritiesUnchanged}
      color="primary"
      fill={true}
      onClick={saveGroupSourcePrioritization}
    >
      {HEADER_ACTION_TEXT}
    </EuiButton>
  );
  const handleSliderChange = (
    id: string,
    e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>
  ) => updatePriority(id, Number((e.target as HTMLInputElement).value));
  const hasSources = contentSources.length > 0;

  const zeroState = (
    <EuiPanel paddingSize="none" className="euiPanel--inset">
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
        actions={<EuiButton onClick={showSharedSourcesModal}>{ZERO_STATE_BUTTON_TEXT}</EuiButton>}
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );

  const sourceTable = (
    <EuiTable className="table table--emphasized" responsive={false} tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{SOURCE_TABLE_HEADER}</EuiTableHeaderCell>
        <EuiTableHeaderCell align="right">{PRIORITY_TABLE_HEADER}</EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        {contentSources.map(({ id, name, serviceType }: IContentSource) => (
          <EuiTableRow key={id} data-test-subj="GroupsRow">
            <EuiTableRowCell>
              <EuiFlexGroup justifyContent="flexStart" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <SourceIcon serviceType={serviceType} name={name} className="source-row__icon" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <span className="source-row__name">{name}</span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiTableRowCell>
            <EuiTableRowCell align="right" style={{ padding: 0 }}>
              <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiRange
                    id={id}
                    min={1}
                    max={10}
                    step={1}
                    value={activeSourcePriorities[id]}
                    onChange={(e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) =>
                      handleSliderChange(id, e)
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ paddingLeft: 10 }}>
                  <div style={{ margin: 0 }} className="input-container--range__count">
                    {activeSourcePriorities[id]}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );

  return (
    <>
      <ViewContentHeader
        title={HEADER_TITLE}
        description={HEADER_DESCRIPTION}
        action={headerAction}
      />
      {hasSources ? sourceTable : zeroState}
    </>
  );
};
