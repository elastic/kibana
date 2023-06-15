/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ENTITY_ANALYTICS_MANAGEMENT } from '../../../../app/translations';
import { AdministrationListPage } from '../../../components/administration_list_page';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSwitch,
  EuiHorizontalRule,
  EuiHealth,
  EuiLink,
  EuiSpacer,
  EuiInMemoryTable,
  EuiFormRow,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { RiskScore } from '../../../../explore/components/risk_score/severity/common';

export const EntityAnalyticsManagementPage = () => {
  const [checked, setChecked] = useState(false);
  const {
    data: {
      query: {},
    },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const columns = [
    {
      field: 'identifierValue',
      name: 'Name',
      sortable: true,
    },
    {
      field: 'level',
      name: 'Level',
      sortable: true,
      render: (risk: string | null) => {
        if (risk != null) {
          return <RiskScore severity={risk} />;
        }
      },
    },
    // {
    //   field: 'identifierField',
    //   name: 'Field',
    //   sortable: true,
    // },
    {
      field: 'totalScoreNormalized',
      align: 'right',
      name: 'Score norm',
      sortable: true,
      render: (scoreNorm: number | null) => {
        if (scoreNorm != null) {
          return Math.round(scoreNorm * 100) / 100;
        }
        return '';
      },
    },
  ];

  const items = [
    {
      level: 'High',
      totalScore: 186.475182329425,
      totalScoreNormalized: 71.39172370958079,
      identifierField: 'host.name',
      identifierValue: 'host-2',
    },
    {
      level: 'Low',
      totalScore: 93.2375911647125,
      totalScoreNormalized: 35.695861854790394,
      identifierField: 'host.name',
      identifierValue: 'host-1',
    },
  ];

  return (
    // <div>
    //   123
    // </div>
    <AdministrationListPage
      data-test-subj="responseActionsPage"
      title={ENTITY_ANALYTICS_MANAGEMENT}
    >
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={3}>
          <>
            <EuiTitle>
              <h2>Status</h2>
            </EuiTitle>

            <EuiFlexItem grow={0}>
              <EuiHorizontalRule margin="s" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}> Entity risk scoring</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems={'center'}>
                    <EuiFlexItem css={{ minWidth: '50px' }}>
                      {checked ? (
                        <EuiHealth color="success">On</EuiHealth>
                      ) : (
                        <EuiHealth color="subdued">Off</EuiHealth>
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSwitch
                        label={''}
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                        compressed
                        aria-describedby={'switchRiskModule'}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="s" />
            </EuiFlexItem>
          </>
          <EuiSpacer />
          <>
            <EuiTitle>
              <h2>Useful links</h2>
            </EuiTitle>
            <EuiSpacer />
            <ul>
              <li>
                <EuiLink
                  href="https://www.elastic.co/guide/en/security/current/detection-entity-dashboard.html"
                  target="_blank"
                  external
                >
                  Entity Analytics documentation
                </EuiLink>
              </li>
            </ul>
          </>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiTitle>
            <h2>Preview</h2>
          </EuiTitle>
          <EuiSpacer />
          <EuiFormRow fullWidth>
            <SearchBar
              appName="riskScore"
              showDatePicker={true}
              showFilterBar={false}
              // isLoading={isLoading}
              // indexPatterns={indexPatterns as DataView[]}
              // query={filterQuery}
              // onClearSavedQuery={onClearSavedQuery}
              // onQuerySubmit={onQuerySubmit}
              // onRefresh={onRefresh}
              // onSaved={onSaved}
              // onTimeRangeChange={onTimeRangeChange}
              // onSavedQueryUpdated={onSavedQueryUpdated}
              // savedQuery={savedQuery}
              // showFilterBar={!hideFilterBar}
              // showDatePicker={true}
              // showQueryInput={!hideQueryInput}
              // showSaveQuery={true}
              // dataTestSubj={dataTestSubj}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth label="Riskiest entities">
            <EuiInMemoryTable
              responsive={false}
              items={items}
              columns={columns}
              loading={false}
              itemId="identifierValue"
              pagination={true}
              sorting={{
                sort: {
                  field: 'calculatedScoreNorm',
                  direction: 'desc' as const,
                },
              }}
              // search={search}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AdministrationListPage>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
