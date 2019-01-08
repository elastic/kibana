/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { i18n } from './i18n';

interface FunctionHelp {
  help: string;
  args?: { [arg: string]: string };
}

interface FunctionHelpDict {
  [fnName: string]: FunctionHelp;
}

export const getFunctionHelp = (): FunctionHelpDict => {
  return {
    all: {
      help: i18n.translate('xpack.canvas.functions.all.args.conditionHelpText', {
        defaultMessage: 'One or more conditions to check',
      }),
      args: {
        condition: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
          defaultMessage: 'One or more conditions to check',
        }),
      },
    },
    alterColumn: {
      args: {
        column: i18n.translate('xpack.canvas.functions.alterColumn.args.columnHelpText', {
          defaultMessage: 'The name of the column to alter',
        }),
        name: i18n.translate('xpack.canvas.functions.alterColumn.args.nameHelpText', {
          defaultMessage: 'The resultant column name. Leave blank to not rename',
        }),
        type: i18n.translate('xpack.canvas.functions.alterColumn.args.typeHelpText', {
          defaultMessage: 'The resultant column type. Leave blank to not change type',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.alterColumnHelpText', {
        defaultMessage:
          'Converts between core types, (e.g. string, number, null, boolean, date) and rename columns',
      }),
    },
    any: {
      args: {
        condition: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
          defaultMessage: 'One or more conditions to check',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.anyHelpText', {
        defaultMessage: 'Return true if any of the conditions are true',
      }),
    },
    as: {
      args: {
        name: i18n.translate('xpack.canvas.functions.as.args.nameHelpText', {
          defaultMessage: 'A name to give the column',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.asHelpText', {
        defaultMessage: 'Creates a datatable with a single value',
      }),
    },
    axisConfig: {
      args: {
        max: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
          defaultMessage:
            'Maximum value displayed in the axis. Must be a number or a date in ms or {isoFormat} string',
          values: {
            isoFormat: 'ISO8601',
          },
        }),
        min: i18n.translate('xpack.canvas.functions.axisConfig.args.minHelpText', {
          defaultMessage:
            'Minimum value displayed in the axis. Must be a number or a date in ms or {isoFormat} string',
          values: {
            isoFormat: 'ISO8601',
          },
        }),
        position: i18n.translate('xpack.canvas.functions.axisConfig.args.positionHelpText', {
          defaultMessage: 'Position of the axis labels. Eg, top, bottom, left, and right',
        }),
        show: i18n.translate('xpack.canvas.functions.axisConfig.args.showHelpText', {
          defaultMessage: 'Show the axis labels?',
        }),
        tickSize: i18n.translate('xpack.canvas.functions.axisConfig.args.tickSizeHelpText', {
          defaultMessage: 'Increment size between each tick. Use for number axes only',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.axisConfigHelpText', {
        defaultMessage: 'Configure axis of a visualization',
      }),
    },
    browser: {
      help: i18n.translate('xpack.canvas.functions.browserHelpText', {
        defaultMessage: 'Force the interpreter to return to the browser',
      }),
    },
    case: {
      args: {
        if: i18n.translate('xpack.canvas.functions.case.args.ifHelpText', {
          defaultMessage:
            'This value is used as whether or not the condition is met. It overrides the unnamed argument if both are provided.',
        }),
        then: i18n.translate('xpack.canvas.functions.case.args.thenHelpText', {
          defaultMessage: 'The value to return if the condition is met',
        }),
        when: i18n.translate('xpack.canvas.functions.case.args.whenHelpText', {
          defaultMessage:
            'This value is compared to the context to see if the condition is met. It is overridden by the "{ifArgument}" argument if both are provided.',
          values: {
            ifArgument: 'if',
          },
        }),
      },
      help: i18n.translate('xpack.canvas.functions.caseHelpText', {
        defaultMessage:
          'Build a case (including a condition/result) to pass to the switch function',
      }),
    },
    clog: {
      help: i18n.translate('xpack.canvas.functions.clogHelpText', {
        defaultMessage: 'Outputs the context to the console',
      }),
    },
    columns: {
      args: {
        exclude: i18n.translate('xpack.canvas.functions.columns.args.excludeHelpText', {
          defaultMessage: 'A comma separated list of column names to remove from the table',
        }),
        include: i18n.translate('xpack.canvas.functions.columns.args.includeHelpText', {
          defaultMessage: 'A comma separated list of column names to keep in the table',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.columnsHelpText', {
        defaultMessage:
          'Include or exclude columns from a data table. If you specify both, this will exclude first',
      }),
    },
    compare: {
      args: {
        op: i18n.translate('xpack.canvas.functions.compare.args.opHelpText', {
          defaultMessage:
            'The operator to use in the comparison: {eqOperator} (equal), {neOperator} (not equal), {ltOperator} (less than), {gtOperator} (greater than), {lteOperator} (less than equal), {gteOperator} (greater than equal)',
          values: {
            eqOperator: '{eq}',
            neOperator: '{ne}',
            ltOperator: '{lt}',
            gtOperator: '{gt}',
            lteOperator: '{lte}',
            gteOperator: '{gte}',
          },
        }),
        to: i18n.translate('xpack.canvas.functions.compare.args.toHelpText', {
          defaultMessage:
            'The value to compare the context to, usually returned by a subexpression',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.compareHelpText', {
        defaultMessage: `Compare the input to something else to determine true or false. Usually used in combination with '{ifArgument}'. This only works with primitive types, such as number, string, and boolean.`,
        values: {
          ifArgument: '{if}',
        },
      }),
    },
    containerStyle: {
      args: {
        backgroundColor: i18n.translate(
          'xpack.canvas.functions.containerStyle.args.backgroundColorHelpText',
          {
            defaultMessage: 'Valid CSS background color string',
          }
        ),
        backgroundImage: i18n.translate(
          'xpack.canvas.functions.containerStyle.args.backgroundImageHelpText',
          {
            defaultMessage: 'Valid CSS background image string',
          }
        ),
        backgroundRepeat: i18n.translate(
          'xpack.canvas.functions.containerStyle.args.backgroundRepeatHelpText',
          {
            defaultMessage: 'Valid CSS background repeat string',
          }
        ),
        backgroundSize: i18n.translate(
          'xpack.canvas.functions.containerStyle.args.backgroundSizeHelpText',
          {
            defaultMessage: 'Valid CSS background size string',
          }
        ),
        border: i18n.translate('xpack.canvas.functions.containerStyle.args.borderHelpText', {
          defaultMessage: 'Valid CSS border string',
        }),
        borderRadius: i18n.translate(
          'xpack.canvas.functions.containerStyle.args.borderRadiusHelpText',
          {
            defaultMessage: 'Number of pixels to use when rounding the border',
          }
        ),
        opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.opacityHelpText', {
          defaultMessage:
            'A number between 0 and 1 representing the degree of transparency of the element',
        }),
        overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.overflowHelpText', {
          defaultMessage: 'Sets overflow of the container',
        }),
        padding: i18n.translate('xpack.canvas.functions.containerStyle.args.paddingHelpText', {
          defaultMessage: 'Content distance in pixels from border',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
        defaultMessage:
          'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
      }),
    },
    context: {
      help: i18n.translate('xpack.canvas.functions.contextHelpText', {
        defaultMessage:
          'Returns whatever you pass into it. This can be useful when you need to use context as argument to a function as a sub-expression',
      }),
    },
    csv: {
      args: {
        data: i18n.translate('xpack.canvas.functions.csv.args.dataHelpText', {
          defaultMessage: 'CSV data to use',
        }),
        delimiter: i18n.translate('xpack.canvas.functions.csv.args.delimiterHelpText', {
          defaultMessage: 'Data separation character',
        }),
        newline: i18n.translate('xpack.canvas.functions.csv.args.newLineHelpText', {
          defaultMessage: 'Row separation character',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.csvHelpText', {
        defaultMessage: 'Create datatable from csv input',
      }),
    },
    date: {
      args: {
        format: i18n.translate('xpack.canvas.functions.date.args.formatHelpText', {
          defaultMessage:
            'The momentJS format for parsing the optional date string (See {documentationLink})',
          values: {
            documentationLink: 'https://momentjs.com/docs/#/displaying/',
          },
        }),
        value: i18n.translate('xpack.canvas.functions.date.args.valueHelpText', {
          defaultMessage:
            'An optional date string to parse into milliseconds since epoch. Can be either a valid Javascript Date input or a string to parse using the format argument. Must be an ISO 8601 string or you must provide the format',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.dateHelpText', {
        defaultMessage:
          'Returns the current time, or a time parsed from a string, as milliseconds since epoch',
      }),
    },
    do: {
      args: {
        fn: i18n.translate('xpack.canvas.functions.doFn.args.fnHelpText', {
          defaultMessage:
            'One or more sub-expressions. The value of these is not available in the root pipeline as this function simply returns the passed in context',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.doFnHelpText', {
        defaultMessage:
          'Runs multiple sub-expressions. Returns the passed in context. Nice for running actions producing functions.',
      }),
    },
    dropdownControl: {
      args: {
        filterColumn: i18n.translate(
          'xpack.canvas.functions.dropdownControl.args.filterColumnHelpText',
          {
            defaultMessage: 'The column or field by which to attach the filter',
          }
        ),
        valueColumn: i18n.translate(
          'xpack.canvas.functions.dropdownControl.args.valueColumnHelpText',
          {
            defaultMessage:
              'The datatable column from which to extract the unique values for the drop down',
          }
        ),
      },
      help: i18n.translate('xpack.canvas.functions.dropdownControlHelpText', {
        defaultMessage: 'Configure a drop down filter control element',
      }),
    },
    eq: {
      args: {
        value: i18n.translate('xpack.canvas.functions.eq.args.valueHelpText', {
          defaultMessage: 'The value by which to compare the context',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.eqHelpText', {
        defaultMessage: 'Return if the context is equal to the argument',
      }),
    },
    exactly: {
      args: {
        column: i18n.translate('xpack.canvas.functions.exactly.args.columnHelpText', {
          defaultMessage: 'The column or field by which to attach the filter',
        }),
        value: i18n.translate('xpack.canvas.functions.exactly.args.valueHelpText', {
          defaultMessage: 'The value to match exactly, including white space and capitalization',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.exactlyHelpText', {
        defaultMessage: 'Create a filter that matches a given column for a perfectly exact value',
      }),
    },
    filterrows: {
      args: {
        fn: i18n.translate('xpack.canvas.functions.filterRows.args.fnHelpText', {
          defaultMessage:
            'An expression into which each row in the datatable will be passed. The expression should return a boolean. A true value will preserve the row, and a false value will remove it.',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.filterRowsHelpText', {
        defaultMessage: 'Filter rows in a datatable based on the return value of a subexpression.',
      }),
    },
    location: {
      help: i18n.translate('xpack.canvas.functions.locationHelpText', {
        defaultMessage: `Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate`,
      }),
    },
    markdown: {
      args: {
        expression: i18n.translate('xpack.canvas.functions.markdown.args.expressionHelpText', {
          defaultMessage:
            'A markdown expression. You can pass this multiple times to achieve concatenation',
        }),
        font: i18n.translate('xpack.canvas.functions.markdown.args.fontHelpText', {
          defaultMessage: 'Font settings. Technically, you can add other styles in here as well',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.markdownHelpText', {
        defaultMessage:
          'An element for rendering markdown text. Great for single numbers, metrics or paragraphs of text.',
      }),
    },
    plot: {
      args: {
        defaultStyle: i18n.translate('xpack.canvas.functions.plot.argsDefaultStyleHelpText', {
          defaultMessage: 'The default style to use for every series',
        }),
        font: i18n.translate('xpack.canvas.functions.plot.argsFontHelpText', {
          defaultMessage: 'Legend and tick mark fonts',
        }),
        legend: i18n.translate('xpack.canvas.functions.plot.argsLegendHelpText', {
          defaultMessage: 'Legend position, nw, sw, ne, se or false',
        }),
        palette: i18n.translate('xpack.canvas.functions.plot.argsPaletteHelpText', {
          defaultMessage: 'A palette object for describing the colors to use on this plot',
        }),
        seriesStyle: i18n.translate('xpack.canvas.functions.plot.argsSeriesStyleHelpText', {
          defaultMessage: 'A style of a specific series',
        }),
        xaxis: i18n.translate('xpack.canvas.functions.plot.argsXaxisHelpText', {
          defaultMessage: 'Axis configuration, or false to disable',
        }),
        yaxis: i18n.translate('xpack.canvas.functions.plot.argsYaxisHelpText', {
          defaultMessage: 'Axis configuration, or false to disable',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.plotHelpText', {
        defaultMessage: 'Configure a plot element',
      }),
    },
    urlparam: {
      args: {
        default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
          defaultMessage: 'Return this string if the url parameter is not defined',
        }),
        param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
          defaultMessage: 'The URL hash parameter to access',
        }),
      },
      help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
        defaultMessage:
          'Access URL parameters and use them in expressions, (e.g. {canvasExampleURL}). This will always return a string',
        values: {
          canvasExampleURL: 'https://localhost:5601/app/canvas?myVar=20',
        },
      }),
    },
  };
};
