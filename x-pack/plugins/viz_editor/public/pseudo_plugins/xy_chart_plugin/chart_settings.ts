import { palettes } from '@elastic/eui';

import {
  TooltipType,
  DEFAULT_CHART_PADDING,
  DEFAULT_GEOMETRY_STYLES,
  DEFAULT_MISSING_COLOR,
} from '@elastic/charts';

const fontFamily = `'Inter UI', -apple-system, BlinkMacSystemFont,
  'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'`;

export const gridHorizontalSettings = {
  stroke: '#EFF1F4',
  strokeWidth: 1,
  opacity: 1,
  dash: [0, 0],
};

export const gridVerticalSettings = {
  stroke: '#EFF1F4',
  strokeWidth: 1,
  opacity: 1,
  dash: [4, 4],
};
/**
 * Temporary placement for EUI specific theming
 */
export const EUI_LIGHT_THEME = {
  chartPaddings: DEFAULT_CHART_PADDING,
  chartMargins: DEFAULT_CHART_PADDING,
  lineSeriesStyle: {
    line: {
      stroke: DEFAULT_MISSING_COLOR,
      strokeWidth: 2,
      visible: true,
    },
    border: {
      stroke: 'gray',
      strokeWidth: 2,
      visible: false,
    },
    point: {
      visible: true,
      radius: 3,
      stroke: 'white',
      strokeWidth: 2,
      opacity: 1,
    },
  },
  areaSeriesStyle: {
    area: {
      fill: DEFAULT_MISSING_COLOR,
      visible: true,
      opacity: 0.3,
    },
    line: {
      stroke: DEFAULT_MISSING_COLOR,
      strokeWidth: 2,
      visible: true,
    },
    border: {
      stroke: 'gray',
      strokeWidth: 2,
      visible: false,
    },
    point: {
      visible: false,
      radius: 1,
      stroke: 'white',
      strokeWidth: 0.5,
      opacity: 1,
    },
  },
  barSeriesStyle: {
    border: {
      stroke: 'white',
      strokeWidth: 1,
      visible: false,
    },
  },
  sharedStyle: DEFAULT_GEOMETRY_STYLES,
  scales: {
    barsPadding: 0.25,
  },
  axes: {
    axisTitleStyle: {
      fontSize: 10,
      fontStyle: 'bold',
      fontFamily: fontFamily,
      padding: 5,
      fill: '#69707D',
    },
    axisLineStyle: {
      stroke: '#EFF1F4',
      strokeWidth: 1,
    },
    tickLabelStyle: {
      fontSize: 8,
      fontFamily: fontFamily,
      fontStyle: 'normal',
      fill: '#69707D',
      padding: 0,
    },
    tickLineStyle: {
      stroke: '#00000000',
      strokeWidth: 0,
    },
  },
  colors: {
    vizColors: palettes.euiPaletteColorBlind.colors,
    defaultVizColor: DEFAULT_MISSING_COLOR,
  },
  legend: {
    verticalWidth: 150,
    horizontalHeight: 50,
  },
  crosshair: {
    band: {
      fill: '#FAFBFD',
      visible: true,
    },
    line: {
      stroke: '#69707D',
      strokeWidth: 1,
      dash: [4, 4],
      visible: true,
    },
  },
};

/**
 * Temporary placement for EUI specific SETTINGS
 */
export const SETTINGS = {
  showLegend: false,
  tooltipType: TooltipType.None,
  theme: EUI_LIGHT_THEME,
};
