/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';

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
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

import { Loading } from '../../../components/shared/loading';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { SourceIcon } from '../../../components/shared/source_icon';

import { TableHeader } from '../../../../shared/table_header';
import { GroupLogic } from '../group_logic';

import { IContentSource } from '../../../types';

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

  const headerItems = ['Source', 'Relevance Priority'];
  const headerAction = (
    <EuiButton
      disabled={groupPrioritiesUnchanged}
      color="primary"
      fill={true}
      onClick={saveGroupSourcePrioritization}
    >
      Save
    </EuiButton>
  );
  const handleSliderChange = (id: string, e: ChangeEvent<HTMLInputElement>) =>
    updatePriority(id, (e.target.value as unknown) as number);
  const hasSources = contentSources.length > 0;

  const zeroState = (
    <EuiPanel paddingSize="none" className="euiPanel--inset">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt
        iconType="advancedSettingsApp"
        iconColor="subdued"
        titleSize="s"
        title={<h3>No sources are shared with this group</h3>}
        body={<>Share two or more sources with {groupName} to customize source prioritization.</>}
        actions={
          <EuiButton onClick={showSharedSourcesModal} color="secondary" fill>
            Add shared content sources
          </EuiButton>
        }
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );

  const sourceTable = (
    <EuiTable className="table table--emphasized" responsive={false}>
      <TableHeader headerItems={headerItems} />
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
            <EuiTableRowCell>
              <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiRange
                    id={id}
                    min={1}
                    max={10}
                    step={1}
                    value={activeSourcePriorities[id]}
                    onChange={(e) => handleSliderChange(id, e as ChangeEvent<HTMLInputElement>)}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ paddingRight: 1 }}>
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
        title="Shared content source prioritization"
        description="Calibrate relative document importance across group content sources."
        action={headerAction}
      />
      {hasSources ? sourceTable : zeroState}
    </>
  );
};
