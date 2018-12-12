/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '../strings';

type FunctionErrorFactory = (...args: string[]) => Error;

interface FunctionErrorDict {
  [fnName: string]: { [errorKey: string]: FunctionErrorFactory };
}

/**
 * Errors thrown in Canvas Functions should be properly localized.  This function
 * produces a dictionary of functions, organized by Function, that produce directly
 * throwable, properly localized Errors.
 */
export const getFunctionErrors = (): FunctionErrorDict => {
  return {
    alterColumn: {
      columnNotFound: (column: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.alterColumn.columnNotFoundErrorMessage', {
            defaultMessage: "Column not found: '{column}'",
            values: {
              column,
            },
          })
        ),
      typeConvertFailure: (type: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.alterColumn.convertToTypeErrorMessage', {
            defaultMessage: 'Cannot convert to {type}',
            values: {
              type,
            },
          })
        ),
    },
    axisConfig: {
      maxInvalid: (max: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.axisConfig.maxArgTypeErrorMessage', {
            defaultMessage: `Invalid date string '{max}' found. '{maxConfig}' must be a number, date in ms, or {isoFormat} date string`,
            values: {
              max,
              maxConfig: 'max',
              isoFormat: 'ISO8601',
            },
          })
        ),
      minInvalid: (min: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.axisConfig.minArgTypeErrorMessage', {
            defaultMessage: `Invalid date string '{min}' found. '{minConfig}' must be a number, date in ms, or {isoFormat} date string`,
            values: {
              min,
              minConfig: 'min',
              isoFormat: 'ISO8601',
            },
          })
        ),
      positionInvalid: (position: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.axisConfig.invalidPositionErrorMessage', {
            defaultMessage: 'Invalid position {position}',
            values: {
              position,
            },
          })
        ),
    },
    compare: {
      operatorInvalid: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.compare.invalidCompareOperatorErrorMessage', {
            defaultMessage:
              'Invalid compare operator. Use {validCompareOperatorsList} or {gteOperator}.',
            values: {
              validCompareOperatorsList: 'eq, ne, lt, gt, lte,',
              gteOperator: 'gte',
            },
          })
        ),
    },
    containerStyle: {
      backgroundImageInvalid: () =>
        new Error(
          i18n.translate(
            'xpack.canvas.functions.containerStyle.invalidBackgroundImageErrorMessage',
            {
              defaultMessage: 'Invalid backgroundImage. Please provide an asset or a URL.',
            }
          )
        ),
    },
    date: {
      dateInvalid: (date: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.date.invalidDateInputErrorMessage', {
            defaultMessage: 'Invalid date input: {date}',
            values: {
              date,
            },
          })
        ),
    },
    font: {
      weightInvalid: (weight: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.font.invalidWeightErrorMessage', {
            defaultMessage: 'Invalid font weight: {weight}',
            values: { weight },
          })
        ),
      alignmentInvalid: (alignment: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.font.invalidAlignmentErrorMessage', {
            defaultMessage: 'Invalid text alignment: {alignment}',
            values: { alignment },
          })
        ),
    },
    getCell: {
      rowNotFound: (row: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.getCell.rowNotFoundErrorMessage', {
            defaultMessage: 'Row not found: {row}',
            values: { row },
          })
        ),
      columnNotFound: (column: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.getCell.columnNotFoundErrorMessage', {
            defaultMessage: 'Column not found: {column}',
            values: { column },
          })
        ),
    },
    math: {
      expressionEmpty: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.math.emptyExpressionErrorMessage', {
            defaultMessage: 'Empty expression',
          })
        ),
      resultLengthInvalid: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.math.expressionReturnValueErrorMessage', {
            defaultMessage:
              'Expressions must return a single number. Try wrapping your expression in mean() or sum()',
          })
        ),
      executeFailure: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.math.executeMathExpressionErrorMessage', {
            defaultMessage: 'Failed to execute math expression. Check your column names',
          })
        ),
      datatableEmpty: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.math.emptyDatabaseErrorMessage', {
            defaultMessage: 'Empty datatable',
          })
        ),
    },
    ply: {
      rowCountInvalid: () =>
        new Error(
          i18n.translate(
            'xpack.canvas.functions.ply.expressionsReturnDifferentRowsNumberErrorMessage',
            {
              defaultMessage: 'All expressions must return the same number of rows',
            }
          )
        ),
      columnNotFound: (column: string) =>
        new Error(
          i18n.translate('xpack.canvas.functions.ply.noSuchColumnErrorMessage', {
            defaultMessage: 'No such column: {column}',
            values: {
              column,
            },
          })
        ),
    },
    progress: {
      maxArgumentInvalid: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.progress.maxValueLessOrEqualZeroMessageError', {
            defaultMessage: "'{maxArgument}' must be greater than 0",
            values: {
              maxArgument: 'max',
            },
          })
        ),
      invalidContext: (max: string) =>
        new Error(
          i18n.translate(
            'xpack.canvas.functions.progress.contextIsNotBetweenZeroAndMaxValueMessageError',
            {
              defaultMessage: 'Context must be between 0 and {max}',
              values: { max },
            }
          )
        ),
    },
    revealImage: {
      inputInvalid: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.revealImage.inputIsNotBetween0And1ErrorMessage', {
            defaultMessage: 'Input must be between 0 and 1',
          })
        ),
    },
    timefilter: {
      stringInvalid: () =>
        new Error(
          i18n.translate('xpack.canvas.functions.timefilter.argsToHelpText', {
            defaultMessage: 'End of the range, in {isoFormat} or Elasticsearch datemath format',
            values: {
              isoFormat: 'ISO8601',
            },
          })
        ),
    },
  };
};
