/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { FormulaIndexPatternColumn } from './formula';
import { formulaOperation, GenericOperationDefinition } from './index';
import type { IndexPattern, IndexPatternLayer } from '../../types';

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: {} as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: {
    ...createMockedIndexPattern(),
    hasRestrictions: false,
  } as IndexPattern,
  operationDefinitionMap: { avg: {} },
};

describe('formula', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = formulaOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
      },
    };
  });

  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;
    let operationDefinitionMap: Record<string, GenericOperationDefinition>;

    function getNewLayerWithFormula(formula: string, isBroken = true): IndexPatternLayer {
      return {
        columns: {
          col1: {
            label: 'Formula',
            dataType: 'number',
            operationType: 'formula',
            isBucketed: false,
            scale: 'ratio',
            params: { formula, isFormulaBroken: isBroken },
            references: [],
          },
        },
        columnOrder: [],
        indexPatternId: '',
      };
    }
    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
      operationDefinitionMap = {
        avg: { input: 'field' } as GenericOperationDefinition,
        count: { input: 'field' } as GenericOperationDefinition,
        derivative: { input: 'fullReference' } as GenericOperationDefinition,
        moving_average: {
          input: 'fullReference',
          operationParams: [{ name: 'window', type: 'number', required: true }],
        } as GenericOperationDefinition,
      };
    });

    it('returns undefined if count is passed without arguments', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('count()'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a field operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg(bytes)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
      // note that field names can be wrapped in quotes as well
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg("bytes")'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(avg(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(avg("bytes"))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the arguments', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes), window=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg("bytes"), "window"=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns an error if field is used with no Lens wrapping operation', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('bytes'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([`The field bytes cannot be used without operation`]);
    });

    it('returns an error if parsing a syntax invalid formula', () => {
      const formulas = [
        '+',
        'avg((',
        'avg((bytes)',
        'avg(bytes) +',
        'avg(""',
        'moving_average(avg(bytes), window=)',
      ];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([`The Formula ${formula} cannot be parsed`]);
      }
    });

    it('returns an error for scenarios where the field is missing', () => {
      // noField, avg(noField), noField + 1, moving_average(noField), moving_average(avg(noField))
      const formulas = ['noField', 'avg(noField)', 'noField + 1', 'moving_average(avg(noField))'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['The field noField was not found.']);
      }
    });

    it('returns an error if field operation in formula have the wrong first argument', () => {
      const formulas = [
        'avg(7)',
        'avg()',
        'avg(avg(bytes))',
        'avg(1 + 2)',
        'avg(bytes + 5)',
        'derivatives(7)',
        'derivatives(7 + 1)',
        'derivatives(bytes + 7)',
      ];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([
          expect.stringMatching(
            `The first argument for ${formula.substring(0, formula.indexOf('('))}`
          ),
        ]);
      }
    });

    it('returns an error if an argument is passed to count() operation', () => {
      const formulas = ['count(7)', 'count("")', 'count(Records)', 'count(bytes)'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['The operation count does not accept any parameter']);
      }
    });

    it('returns an error if an operation with required parameters does not receive them', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The operation moving_average in the Formula is missing the following parameters: window',
      ]);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes), myparam=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The operation moving_average in the Formula is missing the following parameters: window',
      ]);
    });

    it('returns an error if a parameter is passed to an operation with no parameters', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg(bytes, myparam=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(['The operation avg in the Formula requires no parameter']);
    });
  });
});
