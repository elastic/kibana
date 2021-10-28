/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrecisionErrorWarningMessages } from './time_shift_utils';
import type { IndexPatternPrivateState } from './types';
import { FramePublicAPI } from '../types';

describe('time_shift_utils', () => {
  describe('getPrecisionErrorWarningMessages', () => {
    let state: IndexPatternPrivateState;
    let framePublicAPI: FramePublicAPI;

    beforeEach(() => {
      state = {} as IndexPatternPrivateState;
      framePublicAPI = {
        activeData: {
          id: {
            columns: [
              {
                meta: {
                  hasPrecisionError: false,
                },
              },
            ],
          },
        },
      } as unknown as FramePublicAPI;
    });
    test('should not show precisionError if hasPrecisionError is false', () => {
      expect(getPrecisionErrorWarningMessages(state, framePublicAPI)).toMatchInlineSnapshot(
        `Array []`
      );
    });

    test('should not show precisionError if hasPrecisionError is not defined', () => {
      delete framePublicAPI.activeData!.id.columns[0].meta.hasPrecisionError;

      expect(getPrecisionErrorWarningMessages(state, framePublicAPI)).toMatchInlineSnapshot(
        `Array []`
      );
    });

    test('should show precisionError if hasPrecisionError is true', () => {
      framePublicAPI.activeData!.id.columns[0].meta.hasPrecisionError = true;

      expect(getPrecisionErrorWarningMessages(state, framePublicAPI)).toMatchInlineSnapshot(`
        Array [
          <FormattedMessage
            defaultMessage="{docCount} values for a terms aggregation may be approximate. As a result, any sub-aggregations on the terms aggregation may also be approximate."
            id="xpack.lens.indexPattern.precisionErrorWarning"
            values={
              Object {
                "docCount": <strong>
                  <FormattedMessage
                    defaultMessage="doc_count"
                    id="xpack.lens.indexPattern.precisionErrorWarning.docCount"
                    values={Object {}}
                  />
                </strong>,
              }
            }
          />,
        ]
      `);
    });
  });
});
