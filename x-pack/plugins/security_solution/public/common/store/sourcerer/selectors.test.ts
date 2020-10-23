/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockGlobalState } from '../../mock';
import { SourcererScopeName } from './model';
import { getSourcererScopeSelector } from './selectors';

describe('Sourcerer selectors', () => {
  describe('getSourcererScopeSelector', () => {
    it('Should always return the elastic cloud alias to exclude', () => {
      const mapStateToProps = getSourcererScopeSelector();
      expect(
        mapStateToProps(mockGlobalState, SourcererScopeName.default).selectedPatterns
      ).toEqual([
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ]);
    });
  });
});
