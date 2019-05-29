/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import mockAnomaliesTableData from '../../explorer/__mocks__/mock_anomalies_table_data.json';
import { getColumns } from './anomalies_table_columns';

jest.mock('../../privilege/check_privilege', () => ({
  checkPermission: () => false
}));
jest.mock('../../license/check_license', () => ({
  hasLicenseExpired: () => false
}));
jest.mock('../../privilege/get_privileges', () => ({
  getPrivileges: () => { }
}));
jest.mock('../../services/field_format_service', () => ({
  getFieldFormat: () => { }
}));
jest.mock('./links_menu', () => () => <div id="mocLinkCom">mocked link component</div>);
jest.mock('./description_cell', () => () => <div id="mockDescriptorCom">mocked description component</div>);
jest.mock('./detector_cell', () => () => <div id="mocDetectorCom">mocked detector component</div>);
jest.mock('../entity_cell', () => () => <div id="mocEntityCom">mocked entity component</div>);
jest.mock('./influencers_cell', () => () => <div id="mocInfluencerCom">mocked influencer component</div>);

const columnData = {
  items: mockAnomaliesTableData.default.anomalies,
  jobIds: mockAnomaliesTableData.default.jobIds,
  examplesByJobId: mockAnomaliesTableData.default.examplesByJobId,
  isAggregatedData: true,
  interval: mockAnomaliesTableData.default.interval,
  timefilter: jest.fn(),
  showViewSeriesLink: mockAnomaliesTableData.default.showViewSeriesLink,
  showRuleEditorFlyout: false,
  itemIdToExpandedRowMap: false,
  toggleRow: jest.fn(),
  filter: undefined
};

describe('AnomaliesTable', () => {

  test('all columns created', () => {
    const columns = getColumns(
      columnData.items,
      columnData.jobIds,
      columnData.examplesByJobId,
      columnData.examplesByJobId,
      columnData.sAggregatedData,
      columnData.interval,
      columnData.timefilter,
      columnData.showViewSeriesLink,
      columnData.showRuleEditorFlyout,
      columnData.itemIdToExpandedRowMap,
      columnData.toggleRow,
      columnData.filter
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: ''
        }),
        expect.objectContaining({
          name: 'time'
        }),
        expect.objectContaining({
          name: 'severity'
        }),
        expect.objectContaining({
          name: 'detector'
        }),
        expect.objectContaining({
          field: 'entityValue',
          name: 'found for'
        }),
        expect.objectContaining({
          name: 'influenced by'
        }),
        expect.objectContaining({
          name: 'actual'
        }),
        expect.objectContaining({
          name: 'typical'
        }),
        expect.objectContaining({
          name: 'description'
        }),
        expect.objectContaining({
          name: 'category examples'
        })
      ])
    );
  });

  test('no "found for" column if entityValue missing from items', () => {
    const noEntityValueColumnData = {
      ...columnData,
      items: mockAnomaliesTableData.noEntityValue.anomalies
    };

    const columns = getColumns(
      noEntityValueColumnData.items,
      noEntityValueColumnData.jobIds,
      noEntityValueColumnData.examplesByJobId,
      noEntityValueColumnData.examplesByJobId,
      noEntityValueColumnData.sAggregatedData,
      noEntityValueColumnData.interval,
      noEntityValueColumnData.timefilter,
      noEntityValueColumnData.showViewSeriesLink,
      noEntityValueColumnData.showRuleEditorFlyout,
      noEntityValueColumnData.itemIdToExpandedRowMap,
      noEntityValueColumnData.toggleRow,
      noEntityValueColumnData.filter
    );

    expect(columns).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          name: 'found for'
        }),
      ])
    );
  });

  test('no "influenced by" column if influencers missing from items', () => {
    const noInfluencersColumnData = {
      ...columnData,
      items: mockAnomaliesTableData.noInfluencers.anomalies
    };

    const columns = getColumns(
      noInfluencersColumnData.items,
      noInfluencersColumnData.jobIds,
      noInfluencersColumnData.examplesByJobId,
      noInfluencersColumnData.examplesByJobId,
      noInfluencersColumnData.sAggregatedData,
      noInfluencersColumnData.interval,
      noInfluencersColumnData.timefilter,
      noInfluencersColumnData.showViewSeriesLink,
      noInfluencersColumnData.showRuleEditorFlyout,
      noInfluencersColumnData.itemIdToExpandedRowMap,
      noInfluencersColumnData.toggleRow,
      noInfluencersColumnData.filter
    );

    expect(columns).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          name: 'influenced by'
        }),
      ])
    );
  });

  test('no "actual" column if actual missing from items', () => {
    const noActualColumnData = {
      ...columnData,
      items: mockAnomaliesTableData.noActual.anomalies
    };

    const columns = getColumns(
      noActualColumnData.items,
      noActualColumnData.jobIds,
      noActualColumnData.examplesByJobId,
      noActualColumnData.examplesByJobId,
      noActualColumnData.sAggregatedData,
      noActualColumnData.interval,
      noActualColumnData.timefilter,
      noActualColumnData.showViewSeriesLink,
      noActualColumnData.showRuleEditorFlyout,
      noActualColumnData.itemIdToExpandedRowMap,
      noActualColumnData.toggleRow,
      noActualColumnData.filter
    );

    expect(columns).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          name: 'actual'
        }),
      ])
    );
  });

  test('no "typical" column if typical missing from items', () => {
    const noTypicalColumnData = {
      ...columnData,
      items: mockAnomaliesTableData.noTypical.anomalies
    };

    const columns = getColumns(
      noTypicalColumnData.items,
      noTypicalColumnData.jobIds,
      noTypicalColumnData.examplesByJobId,
      noTypicalColumnData.examplesByJobId,
      noTypicalColumnData.sAggregatedData,
      noTypicalColumnData.interval,
      noTypicalColumnData.timefilter,
      noTypicalColumnData.showViewSeriesLink,
      noTypicalColumnData.showRuleEditorFlyout,
      noTypicalColumnData.itemIdToExpandedRowMap,
      noTypicalColumnData.toggleRow,
      noTypicalColumnData.filter
    );

    expect(columns).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          name: 'typical'
        }),
      ])
    );
  });

  test('"job ID" column shown if multiple jobs selected', () => {
    const multipleJobIdsData = {
      ...columnData,
      jobIds: mockAnomaliesTableData.multipleJobIds.jobIds
    };

    const columns = getColumns(
      multipleJobIdsData.items,
      multipleJobIdsData.jobIds,
      multipleJobIdsData.examplesByJobId,
      multipleJobIdsData.examplesByJobId,
      multipleJobIdsData.sAggregatedData,
      multipleJobIdsData.interval,
      multipleJobIdsData.timefilter,
      multipleJobIdsData.showViewSeriesLink,
      multipleJobIdsData.showRuleEditorFlyout,
      multipleJobIdsData.itemIdToExpandedRowMap,
      multipleJobIdsData.toggleRow,
      multipleJobIdsData.filter
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'job ID'
        }),
      ])
    );
  });

});
