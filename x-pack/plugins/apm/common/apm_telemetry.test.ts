/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getApmTelemetryMapping,
  mergeApmTelemetryMapping,
} from './apm_telemetry';

// Add this snapshot serializer for this test. The default snapshot serializer
// prints "Object" next to objects in the JSON output, but we want to be able to
// Use the output from this JSON snapshot to share with the telemetry team. When
// new fields are added to the mapping, we'll have a diff in the snapshot.
expect.addSnapshotSerializer({
  print: (contents) => {
    return JSON.stringify(contents, null, 2);
  },
  test: () => true,
});

describe('APM telemetry helpers', () => {
  describe('getApmTelemetry', () => {
    it('generates a JSON object with the telemetry mapping', () => {
      expect(getApmTelemetryMapping()).toMatchSnapshot();
    });
  });

  describe('mergeApmTelemetryMapping', () => {
    describe('with an invalid mapping', () => {
      it('throws an error', () => {
        expect(() => mergeApmTelemetryMapping({})).toThrowError();
      });
    });

    describe('with a valid mapping', () => {
      it('merges the mapping', () => {
        // This is "valid" in the sense that it has all of the deep fields
        // needed to merge. It's not a valid mapping opbject.
        const validTelemetryMapping = {
          mappings: {
            properties: {
              stack_stats: {
                properties: {
                  kibana: {
                    properties: { plugins: { properties: { apm: {} } } },
                  },
                },
              },
            },
          },
        };

        expect(
          mergeApmTelemetryMapping(validTelemetryMapping)?.mappings.properties
            .stack_stats.properties.kibana.properties.plugins.properties.apm
        ).toEqual(getApmTelemetryMapping());
      });
    });
  });
});
