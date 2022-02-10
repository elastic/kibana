/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  BOOLEAN_FALSE,
  BOOLEAN_TRUE,
  CANVAS,
  CSS,
  ELASTICSEARCH,
  ELASTICSEARCH_SHORT,
  HEX,
  HTML,
  LUCENE,
  MARKDOWN,
  MOMENTJS,
  NUMERALJS,
  RGB,
  SQL,
  TIMELION,
  URL,
} from './constants';

export const ArgumentStrings = {
  AxisConfig: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfigTitle', {
        defaultMessage: 'Axis config',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfigLabel', {
        defaultMessage: 'Visualization axis configuration',
      }),
    getDisabledText: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfigDisabledText', {
        defaultMessage: 'Switch on to view axis settings',
      }),
    getPositionBottom: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.bottomDropDown', {
        defaultMessage: 'bottom',
      }),
    getPositionLabel: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.positionLabel', {
        defaultMessage: 'Position',
      }),
    getPositionLeft: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.leftDropDown', {
        defaultMessage: 'left',
      }),
    getPositionRight: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.rightDropDown', {
        defaultMessage: 'right',
      }),
    getPositionTop: () =>
      i18n.translate('xpack.canvas.uis.arguments.axisConfig.position.options.topDropDown', {
        defaultMessage: 'top',
      }),
  },
  DataColumn: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumnTitle', {
        defaultMessage: 'Column',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumnLabel', {
        defaultMessage: 'Select the data column',
      }),
    getOptionAverage: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.averageDropDown', {
        defaultMessage: 'Average',
      }),
    getOptionCount: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.countDropDown', {
        defaultMessage: 'Count',
      }),
    getOptionFirst: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.firstDropDown', {
        defaultMessage: 'First',
      }),
    getOptionLast: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.lastDropDown', {
        defaultMessage: 'Last',
      }),
    getOptionMax: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.maxDropDown', {
        defaultMessage: 'Max',
      }),
    getOptionMedian: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.medianDropDown', {
        defaultMessage: 'Median',
      }),
    getOptionMin: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.minDropDown', {
        defaultMessage: 'Min',
      }),
    getOptionSum: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.sumDropDown', {
        defaultMessage: 'Sum',
      }),
    getOptionUnique: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.uniqueDropDown', {
        defaultMessage: 'Unique',
      }),
    getOptionValue: () =>
      i18n.translate('xpack.canvas.uis.arguments.dataColumn.options.valueDropDown', {
        defaultMessage: 'Value',
      }),
  },
  DateFormat: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.dateFormatTitle', {
        defaultMessage: 'Date Format',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.dateFormatLabel', {
        defaultMessage: 'Select or enter a {momentJS} format',
        values: {
          momentJS: MOMENTJS,
        },
      }),
  },
  FilterGroup: {
    getCreateNewGroup: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.createNewGroupLinkText', {
        defaultMessage: 'Create new group',
      }),
    getButtonSet: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.setValue', {
        defaultMessage: 'Set',
      }),
    getButtonCancel: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroup.cancelValue', {
        defaultMessage: 'Cancel',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroupTitle', {
        defaultMessage: 'Filter Group',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.filterGroupLabel', {
        defaultMessage: 'Create or select a filter group',
      }),
  },
  ImageUpload: {
    getAssetUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.assetDropDown', {
        defaultMessage: 'Asset',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUploadTitle', {
        defaultMessage: 'Image upload',
      }),
    getFileUploadPrompt: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.fileUploadPromptLabel', {
        defaultMessage: 'Select or drag and drop an image',
      }),
    getFileUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.fileDropDown', {
        defaultMessage: 'Import',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUploadLabel', {
        defaultMessage: 'Select or upload an image',
      }),
    getImageUploading: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.imageUploadingLabel', {
        defaultMessage: 'Image uploading',
      }),
    getLinkUrlType: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.linkDropDown', {
        defaultMessage: 'Link',
      }),
    getUrlFieldPlaceholder: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlFieldPlaceholder', {
        defaultMessage: 'Image {url}',
        values: {
          url: URL,
        },
      }),
    getUrlTypeChangeLegend: () =>
      i18n.translate('xpack.canvas.uis.arguments.imageUpload.urlTypes.changeLegend', {
        defaultMessage: 'Image upload type',
      }),
  },
  Number: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberTitle', {
        defaultMessage: 'Number',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberLabel', {
        defaultMessage: 'Input a number',
      }),
  },
  NumberFormat: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormatTitle', {
        defaultMessage: 'Number Format',
      }),
    getFormatBytes: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.bytesDropDown', {
        defaultMessage: 'Bytes',
      }),
    getFormatCurrency: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.currencyDropDown', {
        defaultMessage: 'Currency',
      }),
    getFormatDuration: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.durationDropDown', {
        defaultMessage: 'Duration',
      }),
    getFormatNumber: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.numberDropDown', {
        defaultMessage: 'Number',
      }),
    getFormatPercent: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormat.format.percentDropDown', {
        defaultMessage: 'Percent',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.numberFormatLabel', {
        defaultMessage: 'Select or enter a valid {numeralJS} format',
        values: {
          numeralJS: NUMERALJS,
        },
      }),
  },
  Palette: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.paletteTitle', {
        defaultMessage: 'Color palette',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.paletteLabel', {
        defaultMessage: 'The collection of colors used to render the element',
      }),
    getCustomPaletteLabel: () =>
      i18n.translate('xpack.canvas.uis.arguments.customPaletteLabel', {
        defaultMessage: 'Custom',
      }),
  },
  Color: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.colorTitle', {
        defaultMessage: 'Color',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.colorLabel', {
        defaultMessage: 'Color picker',
      }),
  },
  Percentage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.percentageTitle', {
        defaultMessage: 'Percentage',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.percentageLabel', {
        defaultMessage: 'Slider for percentage ',
      }),
  },
  Range: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.rangeTitle', {
        defaultMessage: 'Range',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.rangeLabel', {
        defaultMessage: 'Slider for values within a range',
      }),
  },
  Select: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.selectTitle', {
        defaultMessage: 'Select',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.selectLabel', {
        defaultMessage: 'Select from multiple options in a drop down',
      }),
  },
  Shape: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.shapeLabel', {
        defaultMessage: 'Change the shape of the current element',
      }),
  },
  String: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.stringTitle', {
        defaultMessage: 'String',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.stringLabel', {
        defaultMessage: 'Input short strings',
      }),
  },
  Textarea: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.textareaTitle', {
        defaultMessage: 'Textarea',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.textareaLabel', {
        defaultMessage: 'Input long strings',
      }),
  },
  Toggle: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.toggleTitle', {
        defaultMessage: 'Toggle',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.toggleLabel', {
        defaultMessage: 'A true/false toggle switch',
      }),
  },
  VisDimension: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.visDimensionTitle', {
        defaultMessage: 'Column',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.visDimensionLabel', {
        defaultMessage: 'Generates visConfig dimension object',
      }),
    getDefaultOptionName: () =>
      i18n.translate('xpack.canvas.uis.arguments.visDimensionDefaultOptionName', {
        defaultMessage: 'Select column',
      }),
  },
  StopsPalette: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.arguments.stopsPaletteTitle', {
        defaultMessage: 'Palette picker with bounds',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.arguments.stopsPaletteLabel', {
        defaultMessage: 'Provides colors for the values, based on the bounds',
      }),
  },
};

export const DataSourceStrings = {
  // Demo data source
  DemoData: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoDataTitle', {
        defaultMessage: 'Demo data',
      }),
    getHeading: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoData.headingTitle', {
        defaultMessage: 'This element is using demo data',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoDataLabel', {
        defaultMessage: 'Sample data set used to populate default elements',
      }),
    getDescription: () =>
      i18n.translate('xpack.canvas.uis.dataSources.demoDataDescription', {
        defaultMessage:
          'By default, every {canvas} element is connected to the demo data source. Change the data source, above, to connect your own data.',
        values: {
          canvas: CANVAS,
        },
      }),
  },
  // Elasticsearch documents datasource
  ESDocs: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocsTitle', {
        defaultMessage: '{elasticsearch} documents',
        values: {
          elasticsearch: ELASTICSEARCH,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocsLabel', {
        defaultMessage: 'Pull data directly from {elasticsearch} without the use of aggregations',
        values: {
          elasticsearch: ELASTICSEARCH,
        },
      }),
    getWarningTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.warningTitle', {
        defaultMessage: 'Query with caution',
      }),
    getWarning: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.warningDescription', {
        defaultMessage: `
        Using this data source with larger data sets can result in slower performance. Use this source only when you need exact values.`,
      }),
    getIndexTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.indexTitle', {
        defaultMessage: 'Index',
      }),
    getIndexLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.indexLabel', {
        defaultMessage: 'Enter an index name or select a data view',
      }),
    getQueryTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.queryTitle', {
        defaultMessage: 'Query',
      }),
    getQueryLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.queryLabel', {
        defaultMessage: '{lucene} query string syntax',
        values: {
          lucene: LUCENE,
        },
      }),
    getSortFieldTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.sortFieldTitle', {
        defaultMessage: 'Sort field',
      }),
    getSortFieldLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.sortFieldLabel', {
        defaultMessage: 'Document sort field',
      }),
    getSortOrderTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.sortOrderTitle', {
        defaultMessage: 'Sort order',
      }),
    getSortOrderLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.sortOrderLabel', {
        defaultMessage: 'Document sort order',
      }),
    getFieldsTitle: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.fieldsTitle', {
        defaultMessage: 'Fields',
      }),
    getFieldsLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.fieldsLabel', {
        defaultMessage: 'Scripted fields are unavailable',
      }),
    getFieldsWarningLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.fieldsWarningLabel', {
        defaultMessage: 'This datasource performs best with 10 or fewer fields',
      }),
    getAscendingOption: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.ascendingDropDown', {
        defaultMessage: 'Ascending',
      }),
    getDescendingOption: () =>
      i18n.translate('xpack.canvas.uis.dataSources.esdocs.descendingDropDown', {
        defaultMessage: 'Descending',
      }),
  },
  // Elasticsearch SQL data source
  Essql: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essqlTitle', {
        defaultMessage: '{elasticsearch} {sql}',
        values: {
          elasticsearch: ELASTICSEARCH,
          sql: SQL,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essqlLabel', {
        defaultMessage: 'Write an {elasticsearch} {sql} query to retrieve data',
        values: {
          elasticsearch: ELASTICSEARCH,
          sql: SQL,
        },
      }),
    getLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essql.queryTitle', {
        defaultMessage: 'Query',
      }),
    getLabelAppend: () =>
      i18n.translate('xpack.canvas.uis.dataSources.essql.queryTitleAppend', {
        defaultMessage: 'Learn {elasticsearchShort} {sql} query syntax',
        values: {
          elasticsearchShort: ELASTICSEARCH_SHORT,
          sql: SQL,
        },
      }),
  },
  // Timelion datasource
  Timelion: {
    getAbout: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.aboutDetail', {
        defaultMessage: 'Use {timelion} syntax in {canvas} to retrieve timeseries data',
        values: {
          timelion: TIMELION,
          canvas: CANVAS,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelionLabel', {
        defaultMessage: 'Use {timelion} syntax to retrieve timeseries data',
        values: {
          timelion: TIMELION,
        },
      }),
    getIntervalHelp: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.intervalLabel', {
        defaultMessage:
          'Use date math like {weeksExample}, {daysExample}, {secondsExample}, or {auto}',
        values: {
          secondsExample: '10s',
          daysExample: '5d',
          weeksExample: '1w',
          auto: 'auto',
        },
      }),
    getIntervalLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.intervalTitle', {
        defaultMessage: 'Interval',
      }),
    queryLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.queryLabel', {
        defaultMessage: '{timelion} Query String syntax',
        values: {
          timelion: TIMELION,
        },
      }),
    getQueryLabel: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.queryTitle', {
        defaultMessage: 'Query',
      }),
    getTipsHeading: () =>
      i18n.translate('xpack.canvas.uis.dataSources.timelion.tipsTitle', {
        defaultMessage: 'Tips for using {timelion} in {canvas}',
        values: {
          timelion: TIMELION,
          canvas: CANVAS,
        },
      }),
  },
};

export const ModelStrings = {
  Math: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.mathTitle', {
        defaultMessage: 'Measure',
      }),
    getValueDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.math.args.valueTitle', {
        defaultMessage: 'Value',
      }),
    getValueHelp: () =>
      i18n.translate('xpack.canvas.uis.models.math.args.valueLabel', {
        defaultMessage: 'Function and column to use in extracting a value from the datasource',
      }),
  },
  PointSeries: {
    getColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.colorTitle', {
        defaultMessage: 'Color',
      }),
    getColorHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.colorLabel', {
        defaultMessage: 'Determines the color of a mark or series',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeriesTitle', {
        defaultMessage: 'Dimensions & measures',
      }),
    getSizeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.sizeTitle', {
        defaultMessage: 'Size',
      }),
    getSizeHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.sizeLabel', {
        defaultMessage: 'Determine the size of a mark',
      }),
    getTextDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.textTitle', {
        defaultMessage: 'Text',
      }),
    getTextHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.textLabel', {
        defaultMessage: 'Set the text to use as, or around, the mark',
      }),
    getXAxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.xaxisTitle', {
        defaultMessage: 'X-axis',
      }),
    getXAxisHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.xaxisLabel', {
        defaultMessage: 'Data along the horizontal axis. Usually a number, string or date',
      }),
    getYaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.yaxisTitle', {
        defaultMessage: 'Y-axis',
      }),
    getYaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.models.pointSeries.args.yaxisLabel', {
        defaultMessage: 'Data along the vertical axis. Usually a number',
      }),
  },
  HeatmapLegend: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.title', {
        defaultMessage: "Configure the heatmap chart's legend",
      }),
    getIsVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.isVisibleTitle', {
        defaultMessage: 'Show legend',
      }),
    getIsVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.isVisibleLabel', {
        defaultMessage: 'Specifies whether or not the legend is visible',
      }),
    getPositionDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionTitle', {
        defaultMessage: 'Legend Position',
      }),
    getPositionHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionLabel', {
        defaultMessage: 'Specifies the legend position.',
      }),
    getPositionTopOption: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionTopLabel', {
        defaultMessage: 'Top',
      }),
    getPositionBottomOption: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionBottomLabel', {
        defaultMessage: 'Bottom',
      }),
    getPositionLeftOption: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionLeftLabel', {
        defaultMessage: 'Left',
      }),
    getPositionRightOption: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.positionRightLabel', {
        defaultMessage: 'Right',
      }),
    getMaxLinesDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.maxLinesTitle', {
        defaultMessage: 'Legend maximum lines',
      }),
    getMaxLinesHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.maxLinesLabel', {
        defaultMessage: 'Specifies the number of lines per legend item.',
      }),
    getShouldTruncateDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.shouldTruncateTitle', {
        defaultMessage: 'Truncate label',
      }),
    getShouldTruncateHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_legend.args.shouldTruncateLabel', {
        defaultMessage: 'Specifies whether or not the legend items should be truncated',
      }),
  },
  HeatmapGrid: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.title', {
        defaultMessage: 'Configure the heatmap layout',
      }),
    getStrokeWidthDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.strokeWidthTitle', {
        defaultMessage: 'Stroke width',
      }),
    getStrokeWidthHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.strokeWidthLabel', {
        defaultMessage: 'Specifies the grid stroke width',
      }),
    getStrokeColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.strokeColorTitle', {
        defaultMessage: 'Stroke color',
      }),
    getStrokeColorHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.strokeColorLabel', {
        defaultMessage: 'Specifies the grid stroke color',
      }),
    getIsCellLabelVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isCellLabelVisibleTitle', {
        defaultMessage: 'Show cell label',
      }),
    getIsCellLabelVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isCellLabelVisibleLabel', {
        defaultMessage: 'Specifies whether or not the cell label is visible',
      }),
    getIsYAxisLabelVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isYAxisLabelVisibleTile', {
        defaultMessage: 'Show Y-axis labels',
      }),
    getIsYAxisLabelVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isYAxisLabelVisibleLabel', {
        defaultMessage: 'Specifies whether or not the Y-axis labels are visible',
      }),
    getIsYAxisTitleVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isYAxisTitleVisibleTile', {
        defaultMessage: 'Show Y-axis title',
      }),
    getIsYAxisTitleVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isYAxisTitleVisibleLabel', {
        defaultMessage: 'Specifies whether or not the Y-axis title is visible',
      }),
    getIsXAxisLabelVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isXAxisLabelVisibleTile', {
        defaultMessage: 'Show X-axis labels',
      }),
    getIsXAxisLabelVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isXAxisLabelVisibleLabel', {
        defaultMessage: 'Specifies whether or not the X-axis labels are visible',
      }),
    getIsXAxisTitleVisibleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isXAxisTitleVisibleTile', {
        defaultMessage: 'Show X-axis title',
      }),
    getIsXAxisTitleVisibleHelp: () =>
      i18n.translate('xpack.canvas.uis.models.heatmap_grid.args.isXAxisTitleVisibleLabel', {
        defaultMessage: 'Specifies whether or not the X-axis title is visible',
      }),
  },
};

export const TransformStrings = {
  FormatDate: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatDateTitle', {
        defaultMessage: 'Date format',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatDate.args.formatTitle', {
        defaultMessage: 'Format',
      }),
  },
  FormatNumber: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatNumberTitle', {
        defaultMessage: 'Number format',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.formatNumber.args.formatTitle', {
        defaultMessage: 'Format',
      }),
  },
  RoundDate: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDateTitle', {
        defaultMessage: 'Round date',
      }),
    getFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDate.args.formatTitle', {
        defaultMessage: 'Format',
      }),
    getFormatHelp: () =>
      i18n.translate('xpack.canvas.uis.transforms.roundDate.args.formatLabel', {
        defaultMessage: 'Select or enter a {momentJs} format to round the date',
        values: {
          momentJs: MOMENTJS,
        },
      }),
  },
  Sort: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sortTitle', {
        defaultMessage: 'Datatable sorting',
      }),
    getReverseDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sort.args.reverseToggleSwitch', {
        defaultMessage: 'Descending',
      }),
    getSortFieldDisplayName: () =>
      i18n.translate('xpack.canvas.uis.transforms.sort.args.sortFieldTitle', {
        defaultMessage: 'Sort field',
      }),
  },
};

export const ViewStrings = {
  DropdownControl: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControlTitle', {
        defaultMessage: 'Dropdown filter',
      }),
    getFilterDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnTitle', {
        defaultMessage: 'Filter column',
      }),
    getFilterGroupDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupTitle', {
        defaultMessage: 'Filter group',
      }),
    getFilterGroupHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterGroupLabel', {
        defaultMessage:
          "Apply the selected group name to an element's filters function to target this filter",
      }),
    getFilterHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.filterColumnLabel', {
        defaultMessage: 'Column to which the value selected from the dropdown is applied',
      }),
    getValueDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnTitle', {
        defaultMessage: 'Value column',
      }),
    getValueHelp: () =>
      i18n.translate('xpack.canvas.uis.views.dropdownControl.args.valueColumnLabel', {
        defaultMessage: 'Column from which to extract values to make available in the dropdown',
      }),
  },
  GetCell: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.getCellTitle', {
        defaultMessage: 'Dropdown filter',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.getCellLabel', {
        defaultMessage: 'Grab the first row and first column',
      }),
  },
  Image: {
    getContainMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.containDropDown', {
        defaultMessage: 'Contain',
      }),
    getCoverMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.coverDropDown', {
        defaultMessage: 'Cover',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.imageTitle', {
        defaultMessage: 'Image',
      }),
    getModeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.modeTitle', {
        defaultMessage: 'Fill mode',
      }),
    getModeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.modeLabel', {
        defaultMessage: 'Note: Stretched fill may not work with vector images',
      }),
    getStretchMode: () =>
      i18n.translate('xpack.canvas.uis.views.image.args.mode.stretchDropDown', {
        defaultMessage: 'Stretch',
      }),
  },
  Markdown: {
    getContentDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.args.contentTitle', {
        defaultMessage: '{markdown} content',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getContentHelp: () =>
      i18n.translate('xpack.canvas.uis.views.markdown.args.contentLabel', {
        defaultMessage: '{markdown} formatted text',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.markdownTitle', {
        defaultMessage: '{markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.markdownLabel', {
        defaultMessage: 'Generate markup using {markdown}',
        values: {
          markdown: MARKDOWN,
        },
      }),
    getOpenLinksInNewTabDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.openLinksInNewTabTitle', {
        defaultMessage: 'Markdown link settings',
      }),
    getOpenLinksInNewTabLabelName: () =>
      i18n.translate('xpack.canvas.uis.views.openLinksInNewTabLabel', {
        defaultMessage: 'Open all links in a new tab',
      }),
    getOpenLinksInNewTabHelp: () =>
      i18n.translate('xpack.canvas.uis.views.openLinksInNewTabHelpLabel', {
        defaultMessage: 'Set links to open in new tab',
      }),
  },
  Metric: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricTitle', {
        defaultMessage: 'Metric',
      }),
    getNumberDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.numberArgTitle', {
        defaultMessage: 'Value',
      }),
    getLabelDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelArgTitle', {
        defaultMessage: 'Label',
      }),
    getLabelFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelFontTitle', {
        defaultMessage: 'Label text',
      }),
    getLabelFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelFontLabel', {
        defaultMessage: 'Fonts, alignment and color',
      }),
    getLabelHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.labelArgLabel', {
        defaultMessage: 'Enter a text label for the metric value',
      }),
    getMetricFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFontTitle', {
        defaultMessage: 'Metric text',
      }),
    getMetricFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFontLabel', {
        defaultMessage: 'Fonts, alignment and color',
      }),
    getMetricFormatDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatTitle', {
        defaultMessage: 'Format',
      }),
    getMetricFormatHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metric.args.metricFormatLabel', {
        defaultMessage: 'Select a format for the metric value',
      }),
  },
  Pie: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pieTitle', {
        defaultMessage: 'Chart style',
      }),
    getHoleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.holeTitle', {
        defaultMessage: 'Inner radius',
      }),
    getHoleHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.holeLabel', {
        defaultMessage: 'Radius of the hole',
      }),
    getLabelRadiusDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusTitle', {
        defaultMessage: 'Label radius',
      }),
    getLabelRadiusHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelRadiusLabel', {
        defaultMessage: 'Distance of the labels from the center of the pie',
      }),
    getLabelsDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelsTitle', {
        defaultMessage: 'Labels',
      }),
    getLabelsToggleSwitch: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelsToggleSwitch', {
        defaultMessage: 'Show labels',
      }),
    getLabelsHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.labelsLabel', {
        defaultMessage: 'Show/hide labels',
      }),
    getLegendDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.legendTitle', {
        defaultMessage: 'Legend',
      }),
    getLegendHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.legendLabel', {
        defaultMessage: 'Disable or position the legend',
      }),
    getRadiusDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.radiusTitle', {
        defaultMessage: 'Radius',
      }),
    getRadiusHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.radiusLabel', {
        defaultMessage: 'Radius of the pie',
      }),
    getTiltDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.tiltTitle', {
        defaultMessage: 'Tilt angle',
      }),
    getTiltHelp: () =>
      i18n.translate('xpack.canvas.uis.views.pie.args.tiltLabel', {
        defaultMessage: 'Percentage of tilt where 100 is fully vertical and 0 is completely flat',
      }),
  },
  Plot: {
    getDefaultStyleDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleTitle', {
        defaultMessage: 'Default style',
      }),
    getDefaultStyleHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.defaultStyleLabel', {
        defaultMessage: 'Set the style to be used by default by every series, unless overridden',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plotTitle', {
        defaultMessage: 'Chart style',
      }),
    getLegendDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.legendTitle', {
        defaultMessage: 'Legend',
      }),
    getLegendHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.legendLabel', {
        defaultMessage: 'Disable or position the legend',
      }),
    getXaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.xaxisTitle', {
        defaultMessage: 'X-axis',
      }),
    getXaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.xaxisLabel', {
        defaultMessage: 'Configure or disable the x-axis',
      }),
    getYaxisDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.yaxisTitle', {
        defaultMessage: 'Y-axis',
      }),
    getYaxisHelp: () =>
      i18n.translate('xpack.canvas.uis.views.plot.args.yaxisLabel', {
        defaultMessage: 'Configure or disable the Y-axis',
      }),
  },
  Progress: {
    getBarColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barColorTitle', {
        defaultMessage: 'Background color',
      }),
    getBarColorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barColorLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML color names',
      }),
    getBarWeightDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barWeightTitle', {
        defaultMessage: 'Background weight',
      }),
    getBarWeightHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.barWeightLabel', {
        defaultMessage: 'Thickness of the background bar',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progressTitle', {
        defaultMessage: 'Progress',
      }),
    getFontDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.fontTitle', {
        defaultMessage: 'Label settings',
      }),
    getFontHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.fontLabel', {
        defaultMessage:
          'Font settings for the label. Technically, you can add other styles as well',
      }),
    getLabelDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.labelArgTitle', {
        defaultMessage: 'Label',
      }),
    getLabelHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.labelArgLabel', {
        defaultMessage: `Set {true}/{false} to show/hide label or provide a string to display as the label`,
        values: {
          true: BOOLEAN_TRUE,
          false: BOOLEAN_FALSE,
        },
      }),
    getMaxDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.maxTitle', {
        defaultMessage: 'Maximum value',
      }),
    getMaxHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.maxLabel', {
        defaultMessage: 'Maximum value of the progress element',
      }),
    getShapeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getShapeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.shapeLabel', {
        defaultMessage: 'Shape of the progress indicator',
      }),
    getValueColorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueColorTitle', {
        defaultMessage: 'Progress color',
      }),
    getValueColorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueColorLabel', {
        defaultMessage: 'Accepts {hex}, {rgb} or {html} Color names',
        values: {
          html: HTML,
          hex: HEX,
          rgb: RGB,
        },
      }),
    getValueWeightDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightTitle', {
        defaultMessage: 'Progress weight',
      }),
    getValueWeightHelp: () =>
      i18n.translate('xpack.canvas.uis.views.progress.args.valueWeightLabel', {
        defaultMessage: 'Thickness of the progress bar',
      }),
  },
  Render: {
    getCssApply: () =>
      i18n.translate('xpack.canvas.uis.views.render.args.css.applyButtonLabel', {
        defaultMessage: 'Apply Stylesheet',
      }),
    getCssHelp: () =>
      i18n.translate('xpack.canvas.uis.views.render.args.cssLabel', {
        defaultMessage: 'A {css} stylesheet scoped to your element',
        values: {
          css: CSS,
        },
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.renderTitle', {
        defaultMessage: 'Element style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.renderLabel', {
        defaultMessage: 'Setting for the container around your element',
      }),
  },
  RepeatImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImageTitle', {
        defaultMessage: 'Repeating image',
      }),
    getEmptyImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageTitle', {
        defaultMessage: 'Empty image',
      }),
    getEmptyImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.emptyImageLabel', {
        defaultMessage: 'An image to fill up the difference between the value and the max count',
      }),
    getImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageTitle', {
        defaultMessage: 'Image',
      }),
    getImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.imageLabel', {
        defaultMessage: 'An image to repeat',
      }),
    getMaxDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxTitle', {
        defaultMessage: 'Max count',
      }),
    getMaxHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.maxLabel', {
        defaultMessage: 'The maximum number of repeated images',
      }),
    getSizeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeTitle', {
        defaultMessage: 'Image size',
      }),
    getSizeHelp: () =>
      i18n.translate('xpack.canvas.uis.views.repeatImage.args.sizeLabel', {
        defaultMessage:
          'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
      }),
  },
  RevealImage: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImageTitle', {
        defaultMessage: 'Reveal image',
      }),
    getEmptyImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageTitle', {
        defaultMessage: 'Background image',
      }),
    getEmptyImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.emptyImageLabel', {
        defaultMessage: 'A background image. Eg, an empty glass',
      }),
    getImageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.imageTitle', {
        defaultMessage: 'Image',
      }),
    getImageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.imageLabel', {
        defaultMessage: 'An image to reveal given the function input. Eg, a full glass',
      }),
    getOriginBottom: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.bottomDropDown', {
        defaultMessage: 'Bottom',
      }),
    getOriginDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.originTitle', {
        defaultMessage: 'Reveal from',
      }),
    getOriginHelp: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.originLabel', {
        defaultMessage: 'The direction from which to start the reveal',
      }),
    getOriginLeft: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.leftDropDown', {
        defaultMessage: 'Left',
      }),
    getOriginRight: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.rightDropDown', {
        defaultMessage: 'Right',
      }),
    getOriginTop: () =>
      i18n.translate('xpack.canvas.uis.views.revealImage.args.origin.topDropDown', {
        defaultMessage: 'Top',
      }),
  },
  Shape: {
    getBorderDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderTitle', {
        defaultMessage: 'Border',
      }),
    getBorderHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML color names',
      }),
    getBorderWidthDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthTitle', {
        defaultMessage: 'Border width',
      }),
    getBorderWidthHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.borderWidthLabel', {
        defaultMessage: 'Border width',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shapeTitle', {
        defaultMessage: 'Shape',
      }),
    getFillDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.fillTitle', {
        defaultMessage: 'Fill',
      }),
    getFillHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.fillLabel', {
        defaultMessage: 'Accepts HEX, RGB or HTML color names',
      }),
    getMaintainAspectDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectTitle', {
        defaultMessage: 'Aspect ratio settings',
      }),
    getMaintainAspectLabelName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectLabel', {
        defaultMessage: 'Use a fixed ratio',
      }),
    getMaintainAspectHelp: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.maintainAspectHelpLabel', {
        defaultMessage: `Enable to maintain aspect ratio`,
      }),
    getShapeDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.shape.args.shapeTitle', {
        defaultMessage: 'Select shape',
      }),
  },
  Table: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tableTitle', {
        defaultMessage: 'Table style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tableLabel', {
        defaultMessage: 'Set styling for a Table element',
      }),
    getPaginateDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.paginateTitle', {
        defaultMessage: 'Pagination',
      }),
    getPaginateToggleSwitch: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.paginateToggleSwitch', {
        defaultMessage: 'Show pagination controls',
      }),
    getPaginateHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.paginateLabel', {
        defaultMessage:
          'Show or hide pagination controls. If disabled only the first page will be shown',
      }),
    getPerPageDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.perPageTitle', {
        defaultMessage: 'Rows',
      }),
    getPerPageHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.perPageLabel', {
        defaultMessage: 'Number of rows to display per table page',
      }),
    getShowHeaderDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.showHeaderTitle', {
        defaultMessage: 'Header',
      }),
    getShowHeaderToggleSwitch: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.showHeaderToggleSwitch', {
        defaultMessage: 'Show the header row',
      }),
    getShowHeaderHelp: () =>
      i18n.translate('xpack.canvas.uis.views.table.args.showHeaderLabel', {
        defaultMessage: 'Show or hide the header row with titles for each column',
      }),
  },
  Timefilter: {
    getColumnConfirm: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnConfirmButtonLabel', {
        defaultMessage: 'Set',
      }),
    getColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnTitle', {
        defaultMessage: 'Column',
      }),
    getColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.columnLabel', {
        defaultMessage: 'Column to which selected time is applied',
      }),
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilterTitle', {
        defaultMessage: 'Time filter',
      }),
    getFilterGroupDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.filterGroupTitle', {
        defaultMessage: 'Filter group',
      }),
    getFilterGroupHelp: () =>
      i18n.translate('xpack.canvas.uis.views.timefilter.args.filterGroupLabel', {
        defaultMessage:
          "Apply the selected group name to an element's filters function to target this filter",
      }),
  },
  Tagcloud: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloudTitle', {
        defaultMessage: 'Tag Cloud',
      }),
    getScaleColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.scaleDisplayName', {
        defaultMessage: 'Scale',
      }),
    getScaleColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.scaleHelp', {
        defaultMessage: 'Scale to determine font size of a word',
      }),
    getScaleLinear: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.scaleLinearLabel', {
        defaultMessage: 'Linear',
      }),
    getScaleLog: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.scaleLogLabel', {
        defaultMessage: 'Log',
      }),
    getScaleSquareRoot: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.scaleSquareRootLabel', {
        defaultMessage: 'Square root',
      }),
    getOrientationColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.orientationDisplayName', {
        defaultMessage: 'Orientation',
      }),
    getOrientationColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.orientationHelp', {
        defaultMessage: 'Orientation of words inside tagcloud',
      }),
    getOrientationSingle: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.orientationSingleLabel', {
        defaultMessage: 'Single',
      }),
    getOrientationRightAngled: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.orientationRightAngledLabel', {
        defaultMessage: 'Right angled',
      }),
    getOrientationMultiple: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.orientationMultipleLabel', {
        defaultMessage: 'Multiple',
      }),
    getMinFontHeightColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.minFontHeightDisplayName', {
        defaultMessage: 'Minimum font height',
      }),
    getMinFontHeightColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.minFontHeightHelp', {
        defaultMessage: 'Minimum height of the element font',
      }),
    getMaxFontHeightColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.maxFontHeightDisplayName', {
        defaultMessage: 'Maximum font height',
      }),
    getMaxFontHeightColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.maxFontHeightHelp', {
        defaultMessage: 'Maximum height of the element font',
      }),
    getShowLabelColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.showLabelDisplayName', {
        defaultMessage: 'Show label',
      }),
    getShowLabelColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.showLabelHelp', {
        defaultMessage: 'Show label of the chart',
      }),
    getMetricColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.metricDisplayName', {
        defaultMessage: 'Metric',
      }),
    getMetricColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.metricHelp', {
        defaultMessage: 'Metric dimension configuration',
      }),
    getBucketColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.bucketDisplayName', {
        defaultMessage: 'Bucket',
      }),
    getBucketColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.tagcloud.args.bucketHelp', {
        defaultMessage: 'Bucket dimension configuration',
      }),
  },
  MetricVis: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVisTitle', {
        defaultMessage: 'Metric Vis',
      }),
    getMetricColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.metricDisplayName', {
        defaultMessage: 'Metric',
      }),
    getMetricColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.metricHelp', {
        defaultMessage: 'Metric dimension configuration',
      }),
    getBucketColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.bucketDisplayName', {
        defaultMessage: 'Bucket',
      }),
    getBucketColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.bucketHelp', {
        defaultMessage: 'Bucket dimension configuration',
      }),
    getFontColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.fontDisplayName', {
        defaultMessage: 'Font',
      }),
    getFontColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.fontHelp', {
        defaultMessage: 'Metric font configuration',
      }),
    getPercentageModeColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.percentageModeDisplayName', {
        defaultMessage: 'Enable percentage mode',
      }),
    getPercentageModeColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.percentageModeHelp', {
        defaultMessage: 'Shows metric in percentage mode.',
      }),
    getShowLabelsColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.showLabelsDisplayName', {
        defaultMessage: 'Show metric labels',
      }),
    getShowLabelsColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.showLabelsHelp', {
        defaultMessage: 'Shows labels under the metric values.',
      }),
    getColorModeColumnDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.colorModeDisplayName', {
        defaultMessage: 'Metric color mode',
      }),
    getColorModeColumnHelp: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.colorModeHelp', {
        defaultMessage: 'Which part of metric to fill with color.',
      }),
    getColorModeNoneOption: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.colorMode.noneOption', {
        defaultMessage: 'None',
      }),
    getColorModeLabelOption: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.colorMode.labelsOption', {
        defaultMessage: 'Labels',
      }),
    getColorModeBackgroundOption: () =>
      i18n.translate('xpack.canvas.uis.views.metricVis.args.colorMode.backgroundOption', {
        defaultMessage: 'Background',
      }),
  },
  Heatmap: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmapTitle', {
        defaultMessage: 'Heatmap Visualization',
      }),
    getXAccessorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.xAccessorDisplayName', {
        defaultMessage: 'X-axis',
      }),
    getXAccessorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.xAccessorHelp', {
        defaultMessage: 'The name of the x axis column or the corresponding dimension',
      }),
    getYAccessorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.yAccessorDisplayName', {
        defaultMessage: 'Y-axis',
      }),
    getYAccessorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.yAccessorHelp', {
        defaultMessage: 'The name of the y axis column or the corresponding dimension',
      }),
    getValueAccessorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.valueAccessorDisplayName', {
        defaultMessage: 'Value',
      }),
    getValueAccessorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.valueAccessorHelp', {
        defaultMessage: 'The name of the value column or the corresponding dimension',
      }),
    getLegendHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.legendHelp', {
        defaultMessage: "Configure the heatmap chart's legend",
      }),
    getLegendDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.legendDisplayName', {
        defaultMessage: 'Heatmap legend',
      }),
    getGridConfigHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.gridConfigHelp', {
        defaultMessage: 'Configure the heatmap layout',
      }),
    getGridConfigDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.gridConfigDisplayName', {
        defaultMessage: 'Heatmap layout configuration',
      }),
    getSplitRowAccessorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.splitRowAccessorDisplayName', {
        defaultMessage: 'Split row',
      }),
    getSplitRowAccessorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.plitRowAccessorHelp', {
        defaultMessage: 'The id of the split row or the corresponding dimension',
      }),
    getSplitColumnAccessorDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.splitColumnAccessorDisplayName', {
        defaultMessage: 'Split column',
      }),
    getSplitColumnAccessorHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.splitColumnAccessorHelp', {
        defaultMessage: 'The id of the split column or the corresponding dimension',
      }),
    getShowTooltipDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.showTooltipDisplayName', {
        defaultMessage: 'Show tooltip',
      }),
    getShowTooltipHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.showTooltipHelp', {
        defaultMessage: 'Show tooltip on hover',
      }),
    getHighlightInHoverDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.highlightInHoverDisplayName', {
        defaultMessage: 'Hightlight on hover',
      }),
    getHighlightInHoverHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.highlightInHoverHelp', {
        defaultMessage:
          'When this is enabled, it highlights the ranges of the same color on legend hover',
      }),
    getLastRangeIsRightOpenDisplayName: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.lastRangeIsRightOpenDisplayName', {
        defaultMessage: 'Last range is right open',
      }),
    getLastRangeIsRightOpenHelp: () =>
      i18n.translate('xpack.canvas.uis.views.heatmap.args.lastRangeIsRightOpenHelp', {
        defaultMessage: 'If is set to true, the last range value will be right open',
      }),
  },
};
