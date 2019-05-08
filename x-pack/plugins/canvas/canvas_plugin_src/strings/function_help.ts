/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { AvailableFunctions, Function } from '../functions/types';
import { UnionToIntersection } from '../functions/types';

import { OP } from '../functions/common/compare';
import { Shape as ProgressShape } from '../functions/common/progress';

/** This type uses the collection of available functions, (which are all
 * `FunctionFactory`), to derive the name and argument types from them.  This
 * allows for validation that 1/ every function available is listed, and 2/ every
 * function argument has a help string present.
 */
type FunctionHelp<T> = T extends Function<infer Name, infer Arguments, infer Return>
  ? {
      [key in Name]: {
        help: string;
        args: { [key in keyof Arguments]: string };
      }
    }
  : never;

/**
 * This type represents an exhaustive dictionary of Function help strings,
 * organized by Function and then Function Argument.
 *
 * This type indexes the existing function factories, reverses the union to an
 * intersection, and produces the dictionary of strings.
 */

type FunctionHelpDict = UnionToIntersection<FunctionHelp<AvailableFunctions>>;

/**
 * Help text for Canvas Functions should be properly localized. This function will
 * return a dictionary of help strings, organized by Canvas Function specification
 * and then by available arguments.
 */
export const getFunctionHelp = (): FunctionHelpDict => ({
  all: {
    help: i18n.translate('xpack.canvas.functions.allHelpText', {
      defaultMessage: 'Return true if all of the conditions are true',
    }),
    args: {
      condition: i18n.translate('xpack.canvas.functions.all.args.conditionHelpText', {
        defaultMessage: '',
      }),
    },
  },
  alterColumn: {
    help: i18n.translate('xpack.canvas.functions.alterColumnHelpText', {
      defaultMessage:
        'Converts between core types, eg string, number, null, boolean, date and rename columns',
    }),
    args: {
      column: i18n.translate('xpack.canvas.functions.alterColumn.args.columnHelpText', {
        defaultMessage: 'The name of the column to alter',
      }),
      name: i18n.translate('xpack.canvas.functions.alterColumn.args.nameHelpText', {
        defaultMessage: 'The resultant column name. Leave blank to not rename',
      }),
      type: i18n.translate('xpack.canvas.functions.alterColumn.args.typeHelpText', {
        defaultMessage: 'The type to convert the column to. Leave blank to not change type',
      }),
    },
  },
  any: {
    help: i18n.translate('xpack.canvas.functions.anyHelpText', {
      defaultMessage: 'Return true if any of the conditions are true',
    }),
    args: {
      condition: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
        defaultMessage: 'One or more conditions to check',
      }),
    },
  },
  as: {
    help: i18n.translate('xpack.canvas.functions.asHelpText', {
      defaultMessage: 'One or more conditions to check',
    }),
    args: {
      name: i18n.translate('xpack.canvas.functions.as.args.nameHelpText', {
        defaultMessage: 'A name to give the column',
      }),
    },
  },
  axisConfig: {
    help: i18n.translate('xpack.canvas.functions.axisConfigHelpText', {
      defaultMessage: 'Configure axis of a visualization',
    }),
    args: {
      max: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
        defaultMessage:
          'Maximum value displayed in the axis. Must be a number or a date in ms or ISO8601 string',
      }),
      min: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
        defaultMessage:
          'Minimum value displayed in the axis. Must be a number or a date in ms or ISO8601 string',
      }),
      position: i18n.translate('xpack.canvas.functions.axisConfig.args.positionHelpText', {
        defaultMessage: 'Position of the axis labels - top, bottom, left, and right',
      }),
      show: i18n.translate('xpack.canvas.functions.axisConfig.args.showHelpText', {
        defaultMessage: 'Show the axis labels?',
      }),
      tickSize: i18n.translate('xpack.canvas.functions.axisConfig.args.tickSizeHelpText', {
        defaultMessage: 'Increment size between each tick. Use for number axes only',
      }),
    },
  },
  browser: {
    help: i18n.translate('xpack.canvas.functions.browserHelpText', {
      defaultMessage: '',
    }),
    args: {},
  },
  case: {
    help: i18n.translate('xpack.canvas.functions.caseHelpText', {
      defaultMessage: 'Build a case (including a condition/result) to pass to the switch function',
    }),
    args: {
      if: i18n.translate('xpack.canvas.functions.case.args.ifHelpText', {
        defaultMessage:
          'This value is used as whether or not the condition is met. It overrides the unnamed argument if both are provided.',
      }),
      when: i18n.translate('xpack.canvas.functions.case.args.whenHelpText', {
        defaultMessage:
          'This value is compared to the context to see if the condition is met. It is overridden by the "if" argument if both are provided.',
      }),
      then: i18n.translate('xpack.canvas.functions.case.args.thenHelpText', {
        defaultMessage: 'The value to return if the condition is met',
      }),
    },
  },
  clear: {
    help: i18n.translate('xpack.canvas.functions.clearHelpText', {
      defaultMessage: 'Clears context and returns null',
    }),
    args: {},
  },
  columns: {
    help: i18n.translate('xpack.canvas.functions.columnsHelpText', {
      defaultMessage:
        'Include or exclude columns from a data table. If you specify both, this will exclude first',
    }),
    args: {
      include: i18n.translate('xpack.canvas.functions.columns.args.includeHelpText', {
        defaultMessage: 'A comma separated list of column names to keep in the table',
      }),
      exclude: i18n.translate('xpack.canvas.functions.columns.args.excludeHelpText', {
        defaultMessage: 'A comma separated list of column names to remove from the table',
      }),
    },
  },
  compare: {
    help: i18n.translate('xpack.canvas.functions.compareHelpText', {
      defaultMessage:
        'Compare the input to something else to determine true or false. Usually used in combination with `{if}`. This only works with primitive types, such as number, string, and boolean.',
    }),
    args: {
      op: i18n.translate('xpack.canvas.functions.compare.args.opHelpText', {
        defaultMessage:
          'The operator to use in the comparison: eq (equal), ne (not equal), lt (less than), gt (greater than), lte (less than equal), gte (greater than eq)',
        values: {
          equal: OP.EQ,
        },
      }),
      to: i18n.translate('xpack.canvas.functions.compare.args.toHelpText', {
        defaultMessage: 'The value to compare the context to, usually returned by a subexpression',
      }),
    },
  },
  containerStyle: {
    help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
      defaultMessage:
        'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
    }),
    args: {
      border: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Valid CSS border string',
      }),
      borderRadius: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Number of pixels to use when rounding the border',
      }),
      padding: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Content distance in pixels from border',
      }),
      backgroundColor: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Valid CSS background color string',
      }),
      backgroundImage: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Valid CSS background image string',
      }),
      backgroundSize: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Valid CSS background size string',
      }),
      backgroundRepeat: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: 'Valid CSS background repeat string',
      }),
      opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage:
          'A number between 0 and 1 representing the degree of transparency of the element',
      }),
      overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.HelpText', {
        defaultMessage: '',
      }),
    },
  },
  context: {
    help: i18n.translate('xpack.canvas.functions.contextHelpText', {
      defaultMessage:
        'Returns whatever you pass into it. This can be useful when you need to use context as argument to a function as a sub-expression',
    }),
    args: {},
  },
  csv: {
    help: i18n.translate('xpack.canvas.functions.csvHelpText', {
      defaultMessage: 'Create datatable from csv input',
    }),
    args: {
      data: i18n.translate('xpack.canvas.functions.csv.args.dataHelpText', {
        defaultMessage: 'CSV data to use',
      }),
      delimiter: i18n.translate('xpack.canvas.functions.csv.args.delimeterHelpText', {
        defaultMessage: 'Data separation character',
      }),
      newline: i18n.translate('xpack.canvas.functions.csv.args.newlineHelpText', {
        defaultMessage: 'Row separation character',
      }),
    },
  },
  date: {
    help: i18n.translate('xpack.canvas.functions.dateHelpText', {
      defaultMessage:
        'Returns the current time, or a time parsed from a string, as milliseconds since epoch',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.date.args.valueHelpText', {
        defaultMessage:
          'An optional date string to parse into milliseconds since epoch. Can be either a valid Javascript Date input or a string to parse using the format argument. Must be an ISO 8601 string or you must provide the format',
      }),
      format: i18n.translate('xpack.canvas.functions.date.args.formatHelpText', {
        defaultMessage:
          'The momentJS format for parsing the optional date string (See https://momentjs.com/docs/#/displaying/)',
      }),
    },
  },
  demodata: {
    help: i18n.translate('xpack.canvas.functions.demodataHelpText', {
      defaultMessage:
        'A mock data set that includes project CI times with usernames, countries and run phases',
    }),
    args: {
      type: i18n.translate('xpack.canvas.functions.demodata.args.typeHelpText', {
        defaultMessage: 'The name of the demo data set to use',
      }),
    },
  },
  do: {
    help: i18n.translate('xpack.canvas.functions.doHelpText', {
      defaultMessage:
        'Runs multiple sub-expressions. Returns the passed in context. Nice for running actions producing functions.',
    }),
    args: {
      fn: i18n.translate('xpack.canvas.functions.do.args.fnHelpText', {
        defaultMessage:
          'One or more sub-expressions. The value of these is not available in the root pipeline as this function simply returns the passed in context',
      }),
    },
  },
  dropdownControl: {
    help: i18n.translate('xpack.canvas.functions.dropdownControlHelpText', {
      defaultMessage: 'Configure a drop down filter control element',
    }),
    args: {
      filterColumn: i18n.translate(
        'xpack.canvas.functions.dropdownControl.args.filterColumnHelpText',
        {
          defaultMessage: 'The column or field to attach the filter to',
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
  },
  eq: {
    help: i18n.translate('xpack.canvas.functions.eqHelpText', {
      defaultMessage: 'Return if the context is equal to the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.eq.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  escount: {
    help: i18n.translate('xpack.canvas.functions.escountHelpText', {
      defaultMessage: 'Query elasticsearch for a count of the number of hits matching a query',
    }),
    args: {
      index: i18n.translate('xpack.canvas.functions.escount.args.indexHelpText', {
        defaultMessage: 'Specify an index pattern. Eg "logstash-*"',
      }),
      query: i18n.translate('xpack.canvas.functions.escount.args.queryHelpText', {
        defaultMessage: 'A Lucene query string',
      }),
    },
  },
  esdocs: {
    help: i18n.translate('xpack.canvas.functions.esdocsHelpText', {
      defaultMessage:
        'Query elasticsearch and get back raw documents. We recommend you specify the fields you want, especially if you are going to ask for a lot of rows',
    }),
    args: {
      index: i18n.translate('xpack.canvas.functions.esdocs.args.indexHelpText', {
        defaultMessage: 'Specify an index pattern. Eg "logstash-*"',
      }),
      query: i18n.translate('xpack.canvas.functions.esdocs.args.queryHelpText', {
        defaultMessage: 'A Lucene query string',
      }),
      sort: i18n.translate('xpack.canvas.functions.esdocs.args.sortHelpText', {
        defaultMessage:
          'Sort directions as "field, direction". Eg "@timestamp, desc" or "bytes, asc"',
      }),
      fields: i18n.translate('xpack.canvas.functions.esdocs.args.fieldsHelpText', {
        defaultMessage: 'Comma separated list of fields. Fewer fields will perform better',
      }),
      metaFields: i18n.translate('xpack.canvas.functions.esdocs.args.metaFieldsHelpText', {
        defaultMessage: 'Comma separated list of meta fields, eg "_index,_type"',
      }),
      count: i18n.translate('xpack.canvas.functions.esdocs.args.countHelpText', {
        defaultMessage: 'The number of docs to pull back. Smaller numbers perform better',
      }),
    },
  },
  essql: {
    help: i18n.translate('xpack.canvas.functions.essqlHelpText', {
      defaultMessage: 'Elasticsearch SQL',
    }),
    args: {
      query: i18n.translate('xpack.canvas.functions.essql.args.queryHelpText', {
        defaultMessage: 'SQL query',
      }),
      count: i18n.translate('xpack.canvas.functions.essql.args.countHelpText', {
        defaultMessage: 'The number of docs to pull back. Smaller numbers perform better',
      }),
      timezone: i18n.translate('xpack.canvas.functions.essql.args.timezoneHelpText', {
        defaultMessage:
          'Timezone to use for date operations, valid ISO formats and UTC offsets both work',
      }),
    },
  },
  exactly: {
    help: i18n.translate('xpack.canvas.functions.exactlyHelpText', {
      defaultMessage: 'Create a filter that matches a given column for a perfectly exact value',
    }),
    args: {
      column: i18n.translate('xpack.canvas.functions.exactly.args.columnHelpText', {
        defaultMessage: 'The column or field to attach the filter to',
      }),
      value: i18n.translate('xpack.canvas.functions.exactly.args.valueHelpText', {
        defaultMessage: 'The value to match exactly, including white space and capitalization',
      }),
    },
  },
  filterrows: {
    help: i18n.translate('xpack.canvas.functions.filterrowsHelpText', {
      defaultMessage: 'Filter rows in a datatable based on the return value of a subexpression.',
    }),
    args: {
      fn: i18n.translate('xpack.canvas.functions.filterrows.args.fnHelpText', {
        defaultMessage:
          'An expression to pass each rows in the datatable into. The expression should return a boolean. A true value will preserve the row, and a false value will remove it.',
      }),
    },
  },
  font: {
    help: i18n.translate('xpack.canvas.functions.fontHelpText', {
      defaultMessage: 'Create a font style',
    }),
    args: {
      align: i18n.translate('xpack.canvas.functions.font.args.alignHelpText', {
        defaultMessage: 'Horizontal text alignment',
      }),
      color: i18n.translate('xpack.canvas.functions.font.args.colorHelpText', {
        defaultMessage: 'Text color',
      }),
      family: i18n.translate('xpack.canvas.functions.font.args.familyHelpText', {
        defaultMessage: 'An acceptable CSS web font string',
      }),
      italic: i18n.translate('xpack.canvas.functions.font.args.italicHelpText', {
        defaultMessage: 'Italicize, true or false',
      }),
      lHeight: i18n.translate('xpack.canvas.functions.font.args.lHeightHelpText', {
        defaultMessage: 'Line height (px)',
      }),
      size: i18n.translate('xpack.canvas.functions.font.args.sizeHelpText', {
        defaultMessage: 'Font size (px)',
      }),
      underline: i18n.translate('xpack.canvas.functions.font.args.underlineHelpText', {
        defaultMessage: 'Underline the text, true or false',
      }),
      weight: i18n.translate('xpack.canvas.functions.font.args.weightHelpText', {
        defaultMessage:
          'Set the font weight, e.g. normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900',
      }),
    },
  },
  formatdate: {
    help: i18n.translate('xpack.canvas.functions.formatdateHelpText', {
      defaultMessage: 'Output a ms since epoch number as a formatted string',
    }),
    args: {
      format: i18n.translate('xpack.canvas.functions.formatdate.args.formatHelpText', {
        defaultMessage:
          'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/)',
      }),
    },
  },
  formatnumber: {
    help: i18n.translate('xpack.canvas.functions.formatnumberHelpText', {
      defaultMessage: 'Turn a number into a string using a NumberJS format',
    }),
    args: {
      format: i18n.translate('xpack.canvas.functions.formatnumber.args.formatHelpText', {
        defaultMessage: 'NumeralJS format string http://numeraljs.com/#format',
      }),
    },
  },
  getCell: {
    help: i18n.translate('xpack.canvas.functions.vHelpText', {
      defaultMessage: 'Fetch a single cell in a table',
    }),
    args: {
      column: i18n.translate('xpack.canvas.functions.getCell.args.columnHelpText', {
        defaultMessage: 'The name of the column value to fetch',
      }),
      row: i18n.translate('xpack.canvas.functions.getCell.args.rowHelpText', {
        defaultMessage: 'The row number, starting at 0',
      }),
    },
  },
  gt: {
    help: i18n.translate('xpack.canvas.functions.gtHelpText', {
      defaultMessage: 'Return if the context is greater than the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.gt.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  gte: {
    help: i18n.translate('xpack.canvas.functions.gteHelpText', {
      defaultMessage: 'Return if the context is greater than or equal to the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.gte.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  head: {
    help: i18n.translate('xpack.canvas.functions.vHelpText', {
      defaultMessage: 'Get the first N rows from the datatable. Also see `tail`',
    }),
    args: {
      count: i18n.translate('xpack.canvas.functions.head.args.countHelpText', {
        defaultMessage: 'Return this many rows from the beginning of the datatable',
      }),
    },
  },
  if: {
    help: i18n.translate('xpack.canvas.functions.ifHelpText', {
      defaultMessage: 'Perform conditional logic',
    }),
    args: {
      condition: i18n.translate('xpack.canvas.functions.if.args.conditionHelpText', {
        defaultMessage:
          'A boolean true or false, usually returned by a subexpression. If this is not supplied then the input context will be used',
      }),
      then: i18n.translate('xpack.canvas.functions.if.args.thenHelpText', {
        defaultMessage: 'The return value if true',
      }),
      else: i18n.translate('xpack.canvas.functions.if.args.elseHelpText', {
        defaultMessage:
          'The return value if false. If else is not specified, and the condition is false then the input context to the function will be returned',
      }),
    },
  },
  image: {
    help: i18n.translate('xpack.canvas.functions.imageHelpText', {
      defaultMessage: 'Display an image',
    }),
    args: {
      dataurl: i18n.translate('xpack.canvas.functions.image.args.dataurlHelpText', {
        defaultMessage: 'The HTTP(S) URL or base64 data of an image.',
      }),
      mode: i18n.translate('xpack.canvas.functions.image.args.modeHelpText', {
        defaultMessage:
          '"contain" will show the entire image, scaled to fit. "cover" will fill the container with the image, cropping from the sides or bottom as needed.  "stretch" will resize the height and width of the image to 100% of the container',
      }),
    },
  },
  location: {
    help: i18n.translate('xpack.canvas.functions.locationHelpText', {
      defaultMessage:
        "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
    }),
    args: {},
  },
  lt: {
    help: i18n.translate('xpack.canvas.functions.ltHelpText', {
      defaultMessage: 'Return if the context is less than the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.lt.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  lte: {
    help: i18n.translate('xpack.canvas.functions.lteHelpText', {
      defaultMessage: 'Return if the context is less than or equal to the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.lte.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  mapColumn: {
    help: i18n.translate('xpack.canvas.functions.mapColumnHelpText', {
      defaultMessage: 'Add a column calculated as the result of other columns, or not',
    }),
    args: {
      name: i18n.translate('xpack.canvas.functions.mapColumn.args.nameHelpText', {
        defaultMessage: 'The name of the resulting column',
      }),
      expression: i18n.translate('xpack.canvas.functions.mapColumn.args.nameHelpText', {
        defaultMessage:
          'A canvas expression which will be passed each row as a single row datatable',
      }),
    },
  },
  markdown: {
    help: i18n.translate('xpack.canvas.functions.markdownHelpText', {
      defaultMessage:
        'An element for rendering markdown text. Great for single numbers, metrics or paragraphs of text.',
    }),
    args: {
      expression: i18n.translate('xpack.canvas.functions.markdown.args.expressionHelpText', {
        defaultMessage:
          'A markdown expression. You can pass this multiple times to achieve concatenation',
      }),
      font: i18n.translate('xpack.canvas.functions.markdown.args.fontHelpText', {
        defaultMessage: 'Font settings. Technically, you can add other styles in here as well',
      }),
    },
  },
  math: {
    help: i18n.translate('xpack.canvas.functions.mathHelpText', {
      defaultMessage:
        'Interpret a math expression, with a number or datatable as context. Datatable columns are available by their column name. If you pass in a number it is available as "value" (without the quotes)',
    }),
    args: {
      expression: i18n.translate('xpack.canvas.functions.math.args.expressionHelpText', {
        defaultMessage:
          'An evaluated TinyMath expression. (See [TinyMath Functions](https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html))',
      }),
    },
  },
  metric: {
    help: i18n.translate('xpack.canvas.functions.metricHelpText', {
      defaultMessage: 'A number with a label',
    }),
    args: {
      label: i18n.translate('xpack.canvas.functions.metric.args.labelHelpText', {
        defaultMessage: 'Text describing the metric',
      }),
      metricFont: i18n.translate('xpack.canvas.functions.metric.args.metricFontHelpText', {
        defaultMessage:
          'Font settings for the metric. Technically you can stick other styles in here too!',
      }),
      labelFont: i18n.translate('xpack.canvas.functions.metric.args.labelFontHelpText', {
        defaultMessage:
          'Font settings for the label. Technically you can stick other styles in here too!',
      }),
    },
  },
  neq: {
    help: i18n.translate('xpack.canvas.functions.neqHelpText', {
      defaultMessage: 'Return if the context is not equal to the argument',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.neq.args.valueHelpText', {
        defaultMessage: 'The value to compare the context to',
      }),
    },
  },
  palette: {
    help: i18n.translate('xpack.canvas.functions.paletteHelpText', {
      defaultMessage: 'Create a color palette',
    }),
    args: {
      color: i18n.translate('xpack.canvas.functions.palette.args.colorHelpText', {
        defaultMessage:
          'Palette colors, rgba, hex, or HTML color string. Pass this multiple times.',
      }),
      gradient: i18n.translate('xpack.canvas.functions.palette.args.gradientHelpText', {
        defaultMessage: 'Prefer to make a gradient where supported and useful?',
      }),
      reverse: i18n.translate('xpack.canvas.functions.palette.args.reverseHelpText', {
        defaultMessage: 'Reverse the palette',
      }),
    },
  },
  pie: {
    help: i18n.translate('xpack.canvas.functions.pieHelpText', {
      defaultMessage: 'Configure a pie chart element',
    }),
    args: {
      palette: i18n.translate('xpack.canvas.functions.pie.args.paletteHelpText', {
        defaultMessage: 'A palette object for describing the colors to use on this pie',
      }),
      seriesStyle: i18n.translate('xpack.canvas.functions.pie.args.seriesStyleHelpText', {
        defaultMessage: 'A style of a specific series',
      }),
      radius: i18n.translate('xpack.canvas.functions.pie.args.radiusHelpText', {
        defaultMessage: `Radius of the pie as a percentage (between 0 and 1) of the available space. Set to 'auto' to automatically set radius`,
      }),
      hole: i18n.translate('xpack.canvas.functions.pie.args.holeHelpText', {
        defaultMessage: 'Draw a hole in the pie, 0-100, as a percentage of the pie radius',
      }),
      labels: i18n.translate('xpack.canvas.functions.pie.args.labelsHelpText', {
        defaultMessage: 'Show pie labels?',
      }),
      labelRadius: i18n.translate('xpack.canvas.functions.pie.args.labelRadiusHelpText', {
        defaultMessage: 'Percentage of area of container to use as radius for the label circle',
      }),
      font: i18n.translate('xpack.canvas.functions.pie.args.fontHelpText', {
        defaultMessage: 'Label font',
      }),
      legend: i18n.translate('xpack.canvas.functions.pie.args.legendHelpText', {
        defaultMessage: 'Legend position, nw, sw, ne, se or false',
      }),
      tilt: i18n.translate('xpack.canvas.functions.pie.args.tiltHelpText', {
        defaultMessage: 'Percentage of tilt where 1 is fully vertical and 0 is completely flat',
      }),
    },
  },
  plot: {
    help: i18n.translate('xpack.canvas.functions.plotHelpText', {
      defaultMessage: 'Configure a plot element',
    }),
    args: {
      seriesStyle: i18n.translate('xpack.canvas.functions.plot.args.seriesStyleHelpText', {
        defaultMessage: 'A style of a specific series',
      }),
      defaultStyle: i18n.translate('xpack.canvas.functions.plot.args.defaultStyleHelpText', {
        defaultMessage: 'The default style to use for every series',
      }),
      palette: i18n.translate('xpack.canvas.functions.plot.args.paletteHelpText', {
        defaultMessage: 'A palette object for describing the colors to use on this plot',
      }),
      font: i18n.translate('xpack.canvas.functions.plot.args.fontHelpText', {
        defaultMessage: 'Legend and tick mark fonts',
      }),
      legend: i18n.translate('xpack.canvas.functions.plot.args.legendHelpText', {
        defaultMessage: 'Legend position, nw, sw, ne, se or false',
      }),
      yaxis: i18n.translate('xpack.canvas.functions.plot.args.yaxisHelpText', {
        defaultMessage: 'Axis configuration, or false to disable',
      }),
      xaxis: i18n.translate('xpack.canvas.functions.plot.args.xaxisHelpText', {
        defaultMessage: 'Axis configuration, or false to disable',
      }),
    },
  },
  ply: {
    help: i18n.translate('xpack.canvas.functions.plyHelpText', {
      defaultMessage:
        'Subdivide a datatable and pass the resulting tables into an expression, then merge the output',
    }),
    args: {
      by: i18n.translate('xpack.canvas.functions.ply.args.byHelpText', {
        defaultMessage: 'The column to subdivide on',
      }),
      expression: i18n.translate('xpack.canvas.functions.ply.args.expressionHelpText', {
        defaultMessage:
          'An expression to pass each resulting data table into. Tips: \n' +
          ' Expressions must return a datatable. Use `as` to turn literals into datatables.\n' +
          ' Multiple expressions must return the same number of rows.' +
          ' If you need to return a differing row count, pipe into another instance of ply.\n' +
          ' If multiple expressions return the same columns, the last one wins.',
      }),
    },
  },
  pointseries: {
    help: i18n.translate('xpack.canvas.functions.pointseriesHelpText', {
      defaultMessage:
        'Turn a datatable into a point series model. Currently we differentiate measure from dimensions by looking for a [TinyMath function](https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html). ' +
        'If you enter a TinyMath expression in your argument, we treat that argument as a measure, otherwise it is a dimension. Dimensions are combined to create unique ' +
        'keys. Measures are then deduplicated by those keys using the specified TinyMath function',
    }),
    args: {
      x: i18n.translate('xpack.canvas.functions.pointseries.args.xHelpText', {
        defaultMessage: 'The values along the X-axis',
      }),
      y: i18n.translate('xpack.canvas.functions.pointseries.args.yHelpText', {
        defaultMessage: 'The values along the y-axis',
      }),
      color: i18n.translate('xpack.canvas.functions.pointseries.args.colorHelpText', {
        defaultMessage: "An expression to use in determining the mark's color",
      }),
      size: i18n.translate('xpack.canvas.functions.pointseries.args.sizeHelpText', {
        defaultMessage: 'For elements that support it, the size of the marks',
      }),
      text: i18n.translate('xpack.canvas.functions.pointseries.args.textHelpText', {
        defaultMessage: 'For use in charts that support it, the text to show in the mark',
      }),
    },
  },
  progress: {
    help: i18n.translate('xpack.canvas.functions.progressHelpText', {
      defaultMessage: 'Configure a progress element',
    }),
    args: {
      barColor: i18n.translate('xpack.canvas.functions.progress.args.barColorHelpText', {
        defaultMessage: 'Color of the background bar',
      }),
      barWeight: i18n.translate('xpack.canvas.functions.progress.args.barWeightHelpText', {
        defaultMessage: 'Thickness of the background bar',
      }),
      font: i18n.translate('xpack.canvas.functions.progress.args.fontHelpText', {
        defaultMessage:
          'Font settings for the label. Technically you can stick other styles in here too!',
      }),
      label: i18n.translate('xpack.canvas.functions.progress.args.labelHelpText', {
        defaultMessage: `Set true/false to show/hide label or provide a string to display as the label`,
      }),
      max: i18n.translate('xpack.canvas.functions.progress.args.maxHelpText', {
        defaultMessage: 'Maximum value of the progress element',
      }),
      shape: i18n.translate('xpack.canvas.functions.progress.args.shapeHelpText', {
        defaultMessage: `Select {list}, or {end}`,
        values: {
          list: Object.values(ProgressShape)
            .slice(0, -1)
            .join(', '),
          end: Object.values(ProgressShape).slice(-1)[0],
        },
      }),
      valueColor: i18n.translate('xpack.canvas.functions.progress.args.valueColorHelpText', {
        defaultMessage: 'Color of the progress bar',
      }),
      valueWeight: i18n.translate('xpack.canvas.functions.progress.args.valueWeightHelpText', {
        defaultMessage: 'Thickness of the progress bar',
      }),
    },
  },
  render: {
    help: i18n.translate('xpack.canvas.functions.renderHelpText', {
      defaultMessage:
        'Render an input as a specific element and set element level options such as styling',
    }),
    args: {
      as: i18n.translate('xpack.canvas.functions.render.args.asHelpText', {
        defaultMessage:
          'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
      }),
      css: i18n.translate('xpack.canvas.functions.render.args.cssHelpText', {
        defaultMessage: 'Any block of custom CSS to be scoped to this element.',
      }),
      containerStyle: i18n.translate('xpack.canvas.functions.render.args.containerStyleHelpText', {
        defaultMessage: 'Style for the container, including background, border, and opacity',
      }),
    },
  },
  repeatImage: {
    help: i18n.translate('xpack.canvas.functions.HelpText', {
      defaultMessage: 'Configure a repeating image element',
    }),
    args: {
      image: i18n.translate('xpack.canvas.functions.repeatImage.args.imageHelpText', {
        defaultMessage: 'The image to repeat. Usually a dataURL or an asset',
      }),
      size: i18n.translate('xpack.canvas.functions.repeatImage.args.sizeHelpText', {
        defaultMessage:
          'The maximum height or width of the image, in pixels. Eg, if you images is taller than it is wide, this will limit its height',
      }),
      max: i18n.translate('xpack.canvas.functions.repeatImage.args.maxHelpText', {
        defaultMessage: 'Maximum number of times the image may repeat',
      }),
      emptyImage: i18n.translate('xpack.canvas.functions.repeatImage.args.emptyImageHelpText', {
        defaultMessage:
          'Fill the difference between the input and the `max=` parameter with this image',
      }),
    },
  },
  replace: {
    help: i18n.translate('xpack.canvas.functions.repeatImageHelpText', {
      defaultMessage: 'Use a regular expression to replace parts of a string',
    }),
    args: {
      pattern: i18n.translate('xpack.canvas.functions.replace.args.patternHelpText', {
        defaultMessage:
          'The text or pattern of a JavaScript regular expression, eg "[aeiou]". You can use capture groups here.',
      }),
      flags: i18n.translate('xpack.canvas.functions.replace.args.flagsHelpText', {
        defaultMessage:
          'Specify flags. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp for reference.',
      }),
      replacement: i18n.translate('xpack.canvas.functions.replace.args.replacementHelpText', {
        defaultMessage:
          'The replacement for the matching parts of string. Capture groups can be accessed by their index, eg $1',
      }),
    },
  },
  revealImage: {
    help: i18n.translate('xpack.canvas.functions.revealImageHelpText', {
      defaultMessage: 'Configure a image reveal element',
    }),
    args: {
      image: i18n.translate('xpack.canvas.functions.revealImage.args.imageHelpText', {
        defaultMessage: 'The image to reveal',
      }),
      emptyImage: i18n.translate('xpack.canvas.functions.revealImage.args.emptyImageHelpText', {
        defaultMessage: 'An optional background image to reveal over',
      }),
      origin: i18n.translate('xpack.canvas.functions.revealImage.args.originHelpText', {
        defaultMessage: 'Where to start from. Eg, top, left, bottom or right',
      }),
    },
  },
  rounddate: {
    help: i18n.translate('xpack.canvas.functions.rounddateHelpText', {
      defaultMessage:
        'Round ms since epoch using a moment formatting string. Returns ms since epoch',
    }),
    args: {
      format: i18n.translate('xpack.canvas.functions.rounddate.args.formatHelpText', {
        defaultMessage:
          'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/). For example "YYYY-MM" would round to the month',
      }),
    },
  },
  rowCount: {
    help: i18n.translate('xpack.canvas.functions.rowCountHelpText', {
      defaultMessage:
        'Return the number of rows. Pair with ply to get the count of unique column values, or combinations of unique column values.',
    }),
    args: {},
  },
  seriesStyle: {
    help: i18n.translate('xpack.canvas.functions.seriesStyleHelpText', {
      defaultMessage:
        'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
    }),
    args: {
      label: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelHelpText', {
        defaultMessage:
          'The label of the line this style applies to, not the name you would like to give the line',
      }),
      color: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorHelpText', {
        defaultMessage: 'Color to assign the line',
      }),
      lines: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesHelpText', {
        defaultMessage: 'Width of the line',
      }),
      bars: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsHelpText', {
        defaultMessage: 'Width of bars',
      }),
      points: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsHelpText', {
        defaultMessage: 'Size of points on line',
      }),
      fill: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillHelpText', {
        defaultMessage: 'Should we fill points?',
      }),
      stack: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackHelpText', {
        defaultMessage:
          'Should we stack the series? This is the stack "id". Series with the same stack id will be stacked together',
      }),
      horizontalBars: i18n.translate(
        'xpack.canvas.functions.seriesStyle.args.horizontalBarsHelpText',
        {
          defaultMessage: 'Sets the orientation of bars in the chart to horizontal',
        }
      ),
    },
  },
  server: {
    help: i18n.translate('xpack.canvas.functions.serverHelpText', {
      defaultMessage: 'Force the interpreter to return to the server',
    }),
    args: {},
  },
  shape: {
    help: i18n.translate('xpack.canvas.functions.shapeHelpText', {
      defaultMessage: 'Create a shape',
    }),
    args: {
      border: i18n.translate('xpack.canvas.functions.shape.args.borderHelpText', {
        defaultMessage: 'Valid CSS color string',
      }),
      borderWidth: i18n.translate('xpack.canvas.functions.shape.args.borderWidthHelpText', {
        defaultMessage: 'Thickness of the border',
      }),
      shape: i18n.translate('xpack.canvas.functions.shape.args.shapeHelpText', {
        defaultMessage: 'Pick a shape',
      }),
      fill: i18n.translate('xpack.canvas.functions.shape.args.fillHelpText', {
        defaultMessage: 'Valid CSS color string',
      }),
      maintainAspect: i18n.translate('xpack.canvas.functions.shape.args.maintainAspectHelpText', {
        defaultMessage: 'Select true to maintain aspect ratio',
      }),
    },
  },
  sort: {
    help: i18n.translate('xpack.canvas.functions.sortHelpText', {
      defaultMessage: 'Sorts a datatable on a column',
    }),
    args: {
      by: i18n.translate('xpack.canvas.functions.sort.args.byHelpText', {
        defaultMessage:
          'The column to sort on. If column is not specified, the datatable will be sorted on the first column.',
      }),
      reverse: i18n.translate('xpack.canvas.functions.sort.args.reverseHelpText', {
        defaultMessage:
          'Reverse the sort order. If reverse is not specified, the datatable will be sorted in ascending order.',
      }),
    },
  },
  staticColumn: {
    help: i18n.translate('xpack.canvas.functions.staticColumnHelpText', {
      defaultMessage: 'Add a column with a static value',
    }),
    args: {
      name: i18n.translate('xpack.canvas.functions.staticColumn.args.nameHelpText', {
        defaultMessage: 'The name of the new column column',
      }),
      value: i18n.translate('xpack.canvas.functions.staticColumn.args.valueHelpText', {
        defaultMessage:
          'The value to insert in each column. Tip: use a sub-expression to rollup other columns into a static value',
      }),
    },
  },
  string: {
    help: i18n.translate('xpack.canvas.functions.stringHelpText', {
      defaultMessage:
        'Output a string made of other strings. Mostly useful when combined with sub-expressions that output a string, or something castable to a string',
    }),
    args: {
      value: i18n.translate('xpack.canvas.functions.string.args.valueHelpText', {
        defaultMessage: "One or more strings to join together. Don't forget spaces where needed!",
      }),
    },
  },
  switch: {
    help: i18n.translate('xpack.canvas.functions.switchHelpText', {
      defaultMessage: 'Perform conditional logic with multiple conditions',
    }),
    args: {
      case: i18n.translate('xpack.canvas.functions.switch.args.caseHelpText', {
        defaultMessage: 'The list of conditions to check',
      }),
      default: i18n.translate('xpack.canvas.functions.switch.args.defaultHelpText', {
        defaultMessage: 'The default case if no cases match',
      }),
    },
  },
  table: {
    help: i18n.translate('xpack.canvas.functions.tableHelpText', {
      defaultMessage: 'Configure a Data Table element',
    }),
    args: {
      font: i18n.translate('xpack.canvas.functions.table.args.fontHelpText', {
        defaultMessage: 'Font style',
      }),
      paginate: i18n.translate('xpack.canvas.functions.table.args.paginateHelpText', {
        defaultMessage:
          'Show pagination controls. If set to false only the first page will be displayed',
      }),
      perPage: i18n.translate('xpack.canvas.functions.table.args.perPageHelpText', {
        defaultMessage:
          'Show this many rows per page. You probably want to raise this is disabling pagination',
      }),
      showHeader: i18n.translate('xpack.canvas.functions.table.args.showHeaderHelpText', {
        defaultMessage: 'Show or hide the header row with titles for each column',
      }),
    },
  },
  tail: {
    help: i18n.translate('xpack.canvas.functions.tailHelpText', {
      defaultMessage: 'Get the last N rows from the end of a datatable. Also see `head`',
    }),
    args: {
      count: i18n.translate('xpack.canvas.functions.tail.args.countHelpText', {
        defaultMessage: 'Return this many rows from the end of the datatable',
      }),
    },
  },
  timefilter: {
    help: i18n.translate('xpack.canvas.functions.timefilterHelpText', {
      defaultMessage: 'Create a timefilter for querying a source',
    }),
    args: {
      column: i18n.translate('xpack.canvas.functions.timefilter.args.columnHelpText', {
        defaultMessage: 'The column or field to attach the filter to',
      }),
      from: i18n.translate('xpack.canvas.functions.timefilter.args.fromHelpText', {
        defaultMessage: 'Beginning of the range, in ISO8601 or Elasticsearch datemath format',
      }),
      to: i18n.translate('xpack.canvas.functions.timefilter.args.toHelpText', {
        defaultMessage: 'End of the range, in ISO8601 or Elasticsearch datemath format',
      }),
    },
  },
  timefilterControl: {
    help: i18n.translate('xpack.canvas.functions.timefilterControlHelpText', {
      defaultMessage: 'Configure a time filter control element',
    }),
    args: {
      column: i18n.translate('xpack.canvas.functions.timefilterControl.args.columnHelpText', {
        defaultMessage: 'The column or field to attach the filter to',
      }),
      compact: i18n.translate('xpack.canvas.functions.timefilterControl.args.compactHelpText', {
        defaultMessage: 'Show the time filter as a button that triggers a popover',
      }),
    },
  },
  urlparam: {
    help: i18n.translate('xpack.canvas.functions.urlparamHelpText', {
      defaultMessage:
        'Access URL parameters and use them in expressions. Eg https://localhost:5601/app/canvas?myVar=20. This will always return a string',
    }),
    args: {
      param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
        defaultMessage: 'The URL hash parameter to access',
      }),
      default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
        defaultMessage: 'Return this string if the url parameter is not defined',
      }),
    },
  },
});
