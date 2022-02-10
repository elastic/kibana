/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../mock';
import { SourcererScopeName } from './model';
import { getScopePatternListSelection, validateSelectedPatterns } from './helpers';

const signalIndexName = mockGlobalState.sourcerer.signalIndexName;

const dataView = {
  ...mockGlobalState.sourcerer.defaultDataView,
  title: `auditbeat-*,packetbeat-*,${signalIndexName}`,
  patternList: ['packetbeat-*', 'auditbeat-*', `${signalIndexName}`],
};
const patternListNoSignals = mockGlobalState.sourcerer.defaultDataView.patternList
  .filter((p) => p !== signalIndexName)
  .sort();

describe('sourcerer store helpers', () => {
  describe('getScopePatternListSelection', () => {
    it('is not a default data view, returns patternList sorted', () => {
      const result = getScopePatternListSelection(
        {
          ...dataView,
          id: '1234',
        },
        SourcererScopeName.default,
        signalIndexName,
        false
      );
      expect(result).toEqual([`${signalIndexName}`, 'auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.timeline, returns patternList sorted', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.timeline,
        signalIndexName,
        true
      );
      expect(result).toEqual([signalIndexName, 'auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.default, returns patternList sorted without signals index', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.default,
        signalIndexName,
        true
      );
      expect(result).toEqual(['auditbeat-*', 'packetbeat-*']);
    });
    it('default data view, SourcererScopeName.detections, returns patternList with only signals index', () => {
      const result = getScopePatternListSelection(
        dataView,
        SourcererScopeName.detections,
        signalIndexName,
        true
      );
      expect(result).toEqual([signalIndexName]);
    });
  });
  describe('validateSelectedPatterns', () => {
    const payload = {
      id: SourcererScopeName.default,
      selectedDataViewId: dataView.id,
      selectedPatterns: ['auditbeat-*'],
    };
    it('sets selectedPattern', () => {
      const result = validateSelectedPatterns(mockGlobalState.sourcerer, payload, true);
      expect(result).toEqual({
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          selectedPatterns: ['auditbeat-*'],
        },
      });
    });
    it('sets to default when empty array is passed and scope is default', () => {
      const result = validateSelectedPatterns(
        mockGlobalState.sourcerer,
        {
          ...payload,
          selectedPatterns: [],
        },
        true
      );
      expect(result).toEqual({
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          selectedPatterns: patternListNoSignals,
        },
      });
    });
    it('sets to default when empty array is passed and scope is detections', () => {
      const result = validateSelectedPatterns(
        mockGlobalState.sourcerer,
        {
          ...payload,
          id: SourcererScopeName.detections,
          selectedPatterns: [],
        },
        true
      );
      expect(result).toEqual({
        [SourcererScopeName.detections]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.detections],
          selectedDataViewId: dataView.id,
          selectedPatterns: [signalIndexName],
        },
      });
    });
    it('sets to empty when empty array is passed and scope is timeline', () => {
      const result = validateSelectedPatterns(
        mockGlobalState.sourcerer,
        {
          ...payload,
          id: SourcererScopeName.timeline,
          selectedPatterns: [],
        },
        true
      );
      expect(result).toEqual({
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          selectedDataViewId: dataView.id,
          selectedPatterns: [],
        },
      });
    });
    it('sets to alerts in timeline even when does not yet exist', () => {
      const dataViewNoSignals = {
        ...mockGlobalState.sourcerer.defaultDataView,
        patternList: patternListNoSignals,
      };
      const stateNoSignals = {
        ...mockGlobalState.sourcerer,
        defaultDataView: dataViewNoSignals,
        kibanaDataViews: [dataViewNoSignals],
      };
      const result = validateSelectedPatterns(
        stateNoSignals,
        {
          ...payload,
          id: SourcererScopeName.timeline,
          selectedPatterns: [`${mockGlobalState.sourcerer.signalIndexName}`],
        },
        true
      );
      expect(result).toEqual({
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          selectedDataViewId: dataView.id,
          selectedPatterns: [signalIndexName],
        },
      });
    });
    describe('handles missing dataViewId, 7.16 -> 8.0', () => {
      it('selectedPatterns.length > 0 & all selectedPatterns exist in defaultDataView, set dataViewId to defaultDataView.id', () => {
        const result = validateSelectedPatterns(
          mockGlobalState.sourcerer,
          {
            ...payload,
            id: SourcererScopeName.timeline,
            selectedDataViewId: null,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              mockGlobalState.sourcerer.defaultDataView.patternList[4],
            ],
          },
          true
        );
        expect(result).toEqual({
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            selectedDataViewId: null,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              mockGlobalState.sourcerer.defaultDataView.patternList[4],
            ],
          },
        });
      });
      it('selectedPatterns.length > 0 & some selectedPatterns do not exist in defaultDataView, set dataViewId to null', () => {
        const result = validateSelectedPatterns(
          mockGlobalState.sourcerer,
          {
            ...payload,
            id: SourcererScopeName.timeline,
            selectedDataViewId: null,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              'journalbeat-*',
            ],
          },
          true
        );
        expect(result).toEqual({
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            selectedDataViewId: null,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              'journalbeat-*',
            ],
            missingPatterns: ['journalbeat-*'],
          },
        });
      });
    });
  });
});
