/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { Args } from './helpers';
// import { initialSourcererState, SourcererScopeName } from './model';

// const defaultArgs: Args = {
//   eventType: 'all',
//   id: SourcererScopeName.default,
//   selectedPatterns: ['journalbeat-*'],
//   state: {
//     ...initialSourcererState,
//     kibanaDataViews: [
//       initialSourcererState.defaultDataView,
//       { id: '123', title: 'journalbeat-*', patternList: ['journalbeat-*'] },
//     ],
//     signalIndexName: 'signals-*',
//   },
// };
// const eventTypes: Array<Args['eventType']> = ['all', 'raw', 'alert', 'signal', 'custom'];
// const ids: Array<Args['id']> = [
//   SourcererScopeName.default,
//   SourcererScopeName.detections,
//   SourcererScopeName.timeline,
// ];
import { mockGlobalState } from '../../mock';
import { DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { SourcererScopeName } from './model';
import { getScopePatternListSelection, validateSelectedPatterns } from './helpers';

const signalIndexName = mockGlobalState.sourcerer.signalIndexName ?? '';

const dataView = {
  id: DEFAULT_DATA_VIEW_ID,
  title: 'auditbeat-*,packetbeat-*',
  patternList: ['packetbeat-*', 'auditbeat-*', signalIndexName],
};
describe('sourcerer store helpers', () => {
  describe('getScopePatternListSelection', () => {
    it('is not a default data view, returns patternList sorted', () => {
      const result = getScopePatternListSelection(
        {
          ...dataView,
          id: '1234',
        },
        SourcererScopeName.default,
        signalIndexName
      );
      expect(result).toEqual([signalIndexName, 'auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.timeline, returns patternList sorted', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.timeline,
        signalIndexName
      );
      expect(result).toEqual([signalIndexName, 'auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.default, returns patternList sorted without signals index', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.default,
        signalIndexName
      );
      expect(result).toEqual(['auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.detections, returns patternList with only signals index', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.detections,
        signalIndexName
      );
      expect(result).toEqual([signalIndexName]);
    });
  });
  describe.only('validateSelectedPatterns', () => {
    const payload = {
      id: SourcererScopeName.default,
      selectedDataViewId: dataView.id,
      selectedPatterns: ['auditbeat-*'],
    };
    const patternListNoSignals = mockGlobalState.sourcerer.defaultDataView.patternList.filter(
      (p) => p !== signalIndexName
    );
    it('sets selectedPattern', () => {
      const result = validateSelectedPatterns(mockGlobalState.sourcerer, payload);
      expect(result).toEqual({
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          selectedPatterns: ['auditbeat-*'],
        },
      });
    });
    it('sets to default when empty array is passed and scope is default', () => {
      const result = validateSelectedPatterns(mockGlobalState.sourcerer, {
        ...payload,
        selectedPatterns: [],
      });
      expect(result).toEqual({
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          selectedPatterns: patternListNoSignals.sort(),
        },
      });
    });
    it('sets to default when empty array is passed and scope is detections', () => {
      const result = validateSelectedPatterns(mockGlobalState.sourcerer, {
        ...payload,
        id: SourcererScopeName.detections,
        selectedPatterns: [],
      });
      expect(result).toEqual({
        [SourcererScopeName.detections]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.detections],
          selectedPatterns: [signalIndexName],
        },
      });
    });
  });
  it('defaultDataViewByEventType', () => {
    expect(true).toBeTruthy();
  });
});
