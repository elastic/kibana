/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { getPrecisionErrorWarningMessages } from './utils';
import type { IndexPatternPrivateState, GenericIndexPatternColumn } from './types';
import type { FramePublicAPI } from '../types';
import type { DocLinksStart } from '@kbn/core/public';
import { EuiButton } from '@elastic/eui';

describe('indexpattern_datasource utils', () => {
  describe('getPrecisionErrorWarningMessages', () => {
    let state: IndexPatternPrivateState;
    let framePublicAPI: FramePublicAPI;
    let docLinks: DocLinksStart;

    beforeEach(() => {
      state = {
        layers: {
          id: {
            indexPatternId: 'one',
            columns: {
              col1: {
                operationType: 'terms',
                params: {
                  orderBy: {
                    type: 'alphabetical',
                  },
                },
              },
            },
          },
        },
        indexPatterns: {
          one: {
            getFieldByName: (x: string) => ({ name: x, displayName: x }),
          },
        },
      } as unknown as IndexPatternPrivateState;
      framePublicAPI = {
        activeData: {
          id: {
            columns: [
              {
                id: 'col1',
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
      expect(
        getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks, () => {})
      ).toHaveLength(0);
    });

    test('should not show precisionError if hasPrecisionError is not defined', () => {
      delete framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError;

      expect(
        getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks, () => {})
      ).toHaveLength(0);
    });

    test('should show precisionError if hasPrecisionError is true', () => {
      framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;

      expect(
        getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks, () => {})
      ).toHaveLength(1);
    });

    test('if has precision error and sorting is by count ascending, show fix action and switch to rare terms', () => {
      framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
      state.layers.id.columnOrder = ['col1', 'col2'];
      state.layers.id.columns = {
        col1: {
          operationType: 'terms',
          sourceField: 'category',
          params: {
            orderBy: {
              type: 'column',
              columnId: 'col2',
            },
            orderDirection: 'asc',
          },
        } as unknown as GenericIndexPatternColumn,
        col2: {
          operationType: 'count',
        } as unknown as GenericIndexPatternColumn,
      };
      const setState = jest.fn();
      const warnings = getPrecisionErrorWarningMessages(state, framePublicAPI, docLinks, setState);

      expect(warnings).toHaveLength(1);
      const DummyComponent = () => <>{warnings[0]}</>;
      const warningUi = shallow(<DummyComponent />);
      warningUi.find(EuiButton).simulate('click');
      const stateSetter = setState.mock.calls[0][0];
      const newState = stateSetter(state);
      expect(newState.layers.id.columns.col1.label).toEqual('Rare values of category');
      expect(newState.layers.id.columns.col1.params.orderBy).toEqual({
        type: 'rare',
        maxDocCount: 1,
      });
    });
  });
});
