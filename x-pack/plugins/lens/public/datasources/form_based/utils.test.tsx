/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import { getPrecisionErrorWarningMessages, cloneLayer } from './utils';
import type { FormBasedPrivateState, GenericIndexPatternColumn } from './types';
import type { FramePublicAPI } from '../../types';
import type { DocLinksStart } from '@kbn/core/public';
import { EuiLink } from '@elastic/eui';
import { TermsIndexPatternColumn } from './operations';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormBasedLayer } from './types';

describe('indexpattern_datasource utils', () => {
  describe('getPrecisionErrorWarningMessages', () => {
    const datatableUtilitites = createDatatableUtilitiesMock();
    let state: FormBasedPrivateState;
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
              } as TermsIndexPatternColumn,
            },
          },
        },
      } as unknown as FormBasedPrivateState;
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
        dataViews: {
          indexPatterns: {
            one: {
              getFieldByName: (x: string) => ({ name: x, displayName: x }),
            },
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
        getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        )
      ).toHaveLength(0);
    });

    test('should not show precisionError if hasPrecisionError is not defined', () => {
      delete framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError;

      expect(
        getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        )
      ).toHaveLength(0);
    });

    describe('precision error warning with accuracy mode', () => {
      const enableAccuracyButtonSelector =
        'button[data-test-subj="lnsPrecisionWarningEnableAccuracy"]';

      test('should show accuracy mode prompt if currently disabled', async () => {
        framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
        (state.layers.id.columns.col1 as TermsIndexPatternColumn).params.accuracyMode = false;

        const setStateMock = jest.fn();

        const warningMessages = getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          setStateMock
        );

        expect(warningMessages).toHaveLength(1);

        expect({ ...warningMessages[0], longMessage: '' }).toMatchSnapshot();

        const instance = mountWithIntl(<div>{warningMessages[0].longMessage}</div>);

        const enableAccuracyButton = instance.find(enableAccuracyButtonSelector);

        expect(enableAccuracyButton.exists()).toBeTruthy();

        enableAccuracyButton.simulate('click');

        expect(setStateMock).toHaveBeenCalledTimes(1);
      });

      test('should other suggestions if accuracy mode already enabled', async () => {
        framePublicAPI.activeData!.id.columns[0].meta.sourceParams!.hasPrecisionError = true;
        (state.layers.id.columns.col1 as TermsIndexPatternColumn).params.accuracyMode = true;

        const warningMessages = getPrecisionErrorWarningMessages(
          datatableUtilitites,
          state,
          framePublicAPI,
          docLinks,
          () => {}
        );

        expect(warningMessages).toHaveLength(1);

        expect({ ...warningMessages[0], longMessage: '' }).toMatchSnapshot();

        const instance = shallow(<div>{warningMessages[0].longMessage}</div>);

        expect(instance.exists(enableAccuracyButtonSelector)).toBeFalsy();

        expect(instance.find(FormattedMessage).props().id).toBe(
          'xpack.lens.indexPattern.precisionErrorWarning.accuracyEnabled'
        );
      });
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
      const warnings = getPrecisionErrorWarningMessages(
        datatableUtilitites,
        state,
        framePublicAPI,
        docLinks,
        setState
      );

      expect(warnings).toHaveLength(1);
      expect({ ...warnings[0], longMessage: '' }).toMatchSnapshot();
      const DummyComponent = () => <>{warnings[0].longMessage}</>;
      const warningUi = shallow(<DummyComponent />);
      warningUi.find(EuiLink).simulate('click');
      const stateSetter = setState.mock.calls[0][0];
      const newState = stateSetter(state);
      expect(newState.layers.id.columns.col1.label).toEqual('Rare values of category');
      expect(newState.layers.id.columns.col1.params.orderBy).toEqual({
        type: 'rare',
        maxDocCount: 1,
      });
    });
  });

  describe('cloneLayer', () => {
    test('should clone layer with renewing ids', () => {
      expect(
        cloneLayer(
          {
            a: {
              columns: {
                '899ee4b6-3147-4d45-94bf-ea9c02e55d28': {
                  params: {
                    orderBy: {
                      type: 'column',
                      columnId: 'ae62cfc8-faa5-4096-a30c-f92ac59922a0',
                    },
                    orderDirection: 'desc',
                  },
                },
                'ae62cfc8-faa5-4096-a30c-f92ac59922a0': {
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                '899ee4b6-3147-4d45-94bf-ea9c02e55d28',
                'ae62cfc8-faa5-4096-a30c-f92ac59922a0',
              ],
              incompleteColumns: {},
              indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            },
          } as unknown as Record<string, FormBasedLayer>,
          'a',
          'b',
          (id) => id + 'C'
        )
      ).toMatchSnapshot();
    });
  });
});
