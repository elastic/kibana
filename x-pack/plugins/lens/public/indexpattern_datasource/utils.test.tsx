/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrecisionErrorWarningMessages } from './utils';
import type { IndexPatternPrivateState } from './types';
import type { FramePublicAPI } from '../types';
import type { DocLinksStart } from 'kibana/public';

describe('indexpattern_datasource utils', () => {
  describe('getPrecisionErrorWarningMessages', () => {
    let state: IndexPatternPrivateState;
    let framePublicAPI: FramePublicAPI;
    let docLinks: DocLinksStart;

    beforeEach(() => {
      state = {} as IndexPatternPrivateState;
      framePublicAPI = {
        activeData: {
          id: {
            columns: [
              {
                meta: {
                  sourceParams: {
                    hasPrecisionError: false,
                  },
                },
              },
            ],
          },
        },
      } as unknown as FramePublicAPI;

      docLinks = {
        links: {
          aggs: {
            terms_doc_count_error: 'http://terms_doc_count_error',
          },
        },
      } as DocLinksStart;
    });
    test('should not show precisionError if hasPrecisionError is false', () => {
      expect(getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks)).toHaveLength(0);
    });

    test('should not show precisionError if hasPrecisionError is not defined', () => {
      delete framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError;

      expect(getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks)).toHaveLength(0);
    });

    test('should show precisionError if hasPrecisionError is true', () => {
      framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;

      expect(getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks)).toHaveLength(1);
    });
  });
});
