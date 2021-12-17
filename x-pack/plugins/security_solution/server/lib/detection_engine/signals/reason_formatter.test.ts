/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReasonMessageUtil } from './reason_formatters';
import { SignalSourceHit } from './types';

describe('reason_formatter', () => {
  let name: string;
  let severity: string;
  let mergedDoc: SignalSourceHit;
  beforeAll(() => {
    name = 'my-rule';
    severity = 'medium';
    mergedDoc = {
      _index: 'index-1',
      _id: 'id-1',
      fields: {
        'destination.address': ['9.99.99.9'],
        'destination.port': ['6789'],
        'event.category': ['test'],
        'file.name': ['sample'],
        'host.name': ['host'],
        'process.name': ['doingThings.exe'],
        'process.parent.name': ['didThings.exe'],
        'source.address': ['1.11.11.1'],
        'source.port': ['1234'],
        'user.name': ['test-user'],
        '@timestamp': '2021-08-11T02:28:59.101Z',
      },
    };
  });

  describe('buildReasonMessageUtil', () => {
    describe('when rule and mergedDoc are provided', () => {
      it('should return the full reason message', () => {
        expect(buildReasonMessageUtil({ name, severity, mergedDoc })).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, destination 9.99.99.9:6789, by test-user on host created medium alert my-rule."`
        );
      });
    });
    describe('when event category contains multiple items', () => {
      it('should return the reason message with all categories showing', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'event.category': ['item one', 'item two'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: updatedMergedDoc })
        ).toMatchInlineSnapshot(
          `"item one, item two event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, destination 9.99.99.9:6789, by test-user on host created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided, but host.name is missing', () => {
      it('should return the reason message without the host name', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'host.name': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: updatedMergedDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, destination 9.99.99.9:6789, by test-user created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided, but user.name is missing', () => {
      it('should return the reason message without the user name', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'user.name': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: updatedMergedDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, destination 9.99.99.9:6789, on host created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided, but destination details are missing', () => {
      it('should return the reason message without the destination port', () => {
        const noDestinationPortDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'destination.port': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: noDestinationPortDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, destination 9.99.99.9 by test-user on host created medium alert my-rule."`
        );
      });
      it('should return the reason message without destination details', () => {
        const noDestinationPortDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'destination.address': ['-'],
            'destination.port': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: noDestinationPortDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1:1234, by test-user on host created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided, but source details are missing', () => {
      it('should return the reason message without the source port', () => {
        const noSourcePortDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'source.port': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: noSourcePortDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, source 1.11.11.1 destination 9.99.99.9:6789, by test-user on host created medium alert my-rule."`
        );
      });
      it('should return the reason message without source details', () => {
        const noSourcePortDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'source.address': ['-'],
            'source.port': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: noSourcePortDoc })
        ).toMatchInlineSnapshot(
          `"test event with process doingThings.exe, parent process didThings.exe, file sample, destination 9.99.99.9:6789, by test-user on host created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided, but process details missing', () => {
      it('should return the reason message without process details', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'process.name': ['-'],
            'process.parent.name': ['-'],
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: updatedMergedDoc })
        ).toMatchInlineSnapshot(
          `"test event with file sample, source 1.11.11.1:1234, destination 9.99.99.9:6789, by test-user on host created medium alert my-rule."`
        );
      });
    });
    describe('when rule and mergedDoc are provided without any fields of interest', () => {
      it('should return the full reason message', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            'event.category': ['test'],
            'user.name': ['test-user'],
            '@timestamp': '2021-08-11T02:28:59.101Z',
          },
        };
        expect(
          buildReasonMessageUtil({ name, severity, mergedDoc: updatedMergedDoc })
        ).toMatchInlineSnapshot(`"test event by test-user created medium alert my-rule."`);
      });
    });
    describe('when only rule is provided', () => {
      it('should return the reason message without host name or user name', () => {
        expect(buildReasonMessageUtil({ name, severity })).toMatchInlineSnapshot(`""`);
      });
    });
  });
});
