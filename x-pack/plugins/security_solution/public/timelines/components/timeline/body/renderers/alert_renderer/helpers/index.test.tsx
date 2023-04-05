/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TestProviders } from '../../../../../../../common/mock';
import { TableId, TimelineId } from '../../../../../../../../common/types';
import { AlertFieldFlexGroup, DEFAULT_GAP, eventKindMatches, showWith } from '.';

describe('helpers', () => {
  describe('eventKindMatches', () => {
    test('it returns true when `eventKind` is an array of (just) `signal`', () => {
      const eventKind = ['signal'];

      expect(eventKindMatches(eventKind)).toBe(true);
    });

    test('it returns true when `eventKind` is an array of (just) mixed-case `sIgNaL`', () => {
      const eventKind = ['sIgNaL'];

      expect(eventKindMatches(eventKind)).toBe(true);
    });

    test('it returns true when `eventKind` is an array containing other values, AND a mixed-case `sIgNaL`', () => {
      const eventKind = ['foo', 'bar', 'sIgNaL', '@baz'];

      expect(eventKindMatches(eventKind)).toBe(true);
    });

    test('it returns false when `eventKind` does NOT contain the value `signal`', () => {
      const eventKind = ['foo', 'bar', '@baz'];

      expect(eventKindMatches(eventKind)).toBe(false);
    });

    test('it returns false when `eventKind` is `undefined`', () => {
      const eventKind = undefined;

      expect(eventKindMatches(eventKind)).toBe(false);
    });

    test('it returns false when `eventKind` is empty', () => {
      const eventKind: string[] = [];

      expect(eventKindMatches(eventKind)).toBe(false);
    });
  });

  describe('showWith', () => {
    const data: Ecs = {
      _id: 'abcd',
      destination: {
        ip: ['10.0.0.1'],
      },
      source: {
        ip: ['127.0.0.1'],
      },
    };

    test('it returns true when `data` contains (just one) of the `fieldNames`', () => {
      const fieldNames = ['source.ip'];

      expect(showWith({ data, fieldNames })).toBe(true);
    });

    test('it returns true when `data` contains more than one of the `fieldNames`', () => {
      const fieldNames = ['destination.ip', 'source.ip'];

      expect(showWith({ data, fieldNames })).toBe(true);
    });

    test('it returns false when `data` does NOT contain any of the `fieldNames`', () => {
      const fieldNames = ['destination.ip', 'source.ip'];

      expect(showWith({ data: { _id: 'abcd' }, fieldNames })).toBe(false);
    });

    test('it returns false when `fieldNames` does NOT contain any of the fields in `data`', () => {
      const fieldNames = ['foo', 'bar', '@baz'];

      expect(showWith({ data, fieldNames })).toBe(false);
    });

    test('it returns false when `fieldNames` is empty', () => {
      const fieldNames: string[] = [];

      expect(showWith({ data, fieldNames })).toBe(false);
    });
  });

  describe('AlertFieldFlexGroup', () => {
    test('it has a 0px gap between flex items for the active timeline', () => {
      render(
        <TestProviders>
          <AlertFieldFlexGroup
            data-test-subj="test"
            $scopeId={TimelineId.active} // <-- the active timeline
          />
        </TestProviders>
      );

      expect(screen.getByTestId('test')).toHaveStyleRule('gap', '0px');
    });

    test('it has the default gap between flex items for any other (non-active) timeline', () => {
      render(
        <TestProviders>
          <AlertFieldFlexGroup
            data-test-subj="test"
            $scopeId={TableId.alertsOnAlertsPage} // <-- the alerts page
          />
        </TestProviders>
      );

      expect(screen.getByTestId('test')).toHaveStyleRule('gap', `${DEFAULT_GAP}px`);
    });
  });
});
