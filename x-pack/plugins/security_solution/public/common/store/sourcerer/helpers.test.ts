/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../mock';
import { SourcererScopeName } from './model';
import {
  defaultDataViewByEventType,
  getScopePatternListSelection,
  validateSelectedPatterns,
} from './helpers';

const signalIndexName = mockGlobalState.sourcerer.signalIndexName;

const dataView = {
  ...mockGlobalState.sourcerer.defaultDataView,
  title: `auditbeat-*,packetbeat-*,${signalIndexName}`,
  patternList: ['packetbeat-*', 'auditbeat-*', `${signalIndexName}`],
};
const patternListNoSignals = mockGlobalState.sourcerer.defaultDataView.patternList
  .filter((p) => p !== signalIndexName)
  .sort();
const patternListSignals = [
  signalIndexName,
  ...mockGlobalState.sourcerer.defaultDataView.patternList.filter((p) => p !== signalIndexName),
].sort();

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
          selectedPatterns: patternListNoSignals,
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
          selectedDataViewId: dataView.id,
          selectedPatterns: [signalIndexName],
        },
      });
    });
    it('sets to default when empty array is passed and scope is timeline', () => {
      const result = validateSelectedPatterns(mockGlobalState.sourcerer, {
        ...payload,
        id: SourcererScopeName.timeline,
        selectedPatterns: [],
      });
      expect(result).toEqual({
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          selectedDataViewId: dataView.id,
          selectedPatterns: [
            signalIndexName,
            ...mockGlobalState.sourcerer.defaultDataView.patternList.filter(
              (p) => p !== signalIndexName
            ),
          ].sort(),
        },
      });
    });
    describe('handles missing dataViewId, 7.16 -> 8.0', () => {
      it('selectedPatterns.length > 0 & all selectedPatterns exist in defaultDataView, set dataViewId to defaultDataView.id', () => {
        const result = validateSelectedPatterns(mockGlobalState.sourcerer, {
          ...payload,
          id: SourcererScopeName.timeline,
          selectedDataViewId: '',
          selectedPatterns: [
            mockGlobalState.sourcerer.defaultDataView.patternList[3],
            mockGlobalState.sourcerer.defaultDataView.patternList[4],
          ],
        });
        expect(result).toEqual({
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            selectedDataViewId: dataView.id,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              mockGlobalState.sourcerer.defaultDataView.patternList[4],
            ],
          },
        });
      });
      it('selectedPatterns.length > 0 & a pattern in selectedPatterns does not exist in defaultDataView, set dataViewId to null', () => {
        const result = validateSelectedPatterns(mockGlobalState.sourcerer, {
          ...payload,
          id: SourcererScopeName.timeline,
          selectedDataViewId: '',
          selectedPatterns: [
            mockGlobalState.sourcerer.defaultDataView.patternList[3],
            'journalbeat-*',
          ],
        });
        expect(result).toEqual({
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            selectedDataViewId: null,
            selectedPatterns: [
              mockGlobalState.sourcerer.defaultDataView.patternList[3],
              'journalbeat-*',
            ],
          },
        });
      });
    });
  });
  describe('defaultDataViewByEventType', () => {
    it('defaults with no eventType', () => {
      const result = defaultDataViewByEventType({ state: mockGlobalState.sourcerer });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: patternListSignals,
      });
    });
    it('defaults with eventType: all', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'all',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: patternListSignals,
      });
    });
    it('defaults with eventType: raw', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'raw',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: patternListNoSignals,
      });
    });
    it('defaults with eventType: alert', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'alert',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: [signalIndexName],
      });
    });
    it('defaults with eventType: signal', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'signal',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: [signalIndexName],
      });
    });
    it('defaults with eventType: custom', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'custom',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: patternListSignals,
      });
    });
    it('defaults with eventType: eql', () => {
      const result = defaultDataViewByEventType({
        state: mockGlobalState.sourcerer,
        eventType: 'eql',
      });
      expect(result).toEqual({
        selectedDataViewId: dataView.id,
        selectedPatterns: patternListSignals,
      });
    });
  });
});
