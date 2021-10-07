/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../mock';
import { DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { SourcererScopeName } from './model';
import {
  defaultDataViewByEventType,
  getScopePatternListSelection,
  isSignalIndex,
  validateSelectedPatterns,
} from './helpers';

const signalIndexName = mockGlobalState.sourcerer.signalIndexName;

const dataView = {
  ...mockGlobalState.sourcerer.defaultDataView,
  id: DEFAULT_DATA_VIEW_ID,
  title: `auditbeat-*,packetbeat-*,${signalIndexName}`,
  patternList: ['packetbeat-*', 'auditbeat-*', `${signalIndexName}`],
};
const patternListNoSignals = mockGlobalState.sourcerer.defaultDataView.patternList
  .filter((p) => !isSignalIndex(p, signalIndexName))
  .sort();
const patternListSignals = [
  signalIndexName,
  ...mockGlobalState.sourcerer.defaultDataView.patternList.filter(
    (p) => !isSignalIndex(p, signalIndexName)
  ),
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
        signalIndexName
      );
      expect(result).toEqual([`${signalIndexName}`, 'auditbeat-*', 'packetbeat-*']);
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
              (p) => !isSignalIndex(p, signalIndexName)
            ),
          ].sort(),
        },
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
