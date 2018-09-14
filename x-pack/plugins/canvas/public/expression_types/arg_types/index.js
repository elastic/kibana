import { color } from './color';
import { seriesStyle } from './series_style';
import { containerStyle } from './container_style';
import { font } from './font';

// Anything that uses the color picker has to be loaded privately because the color picker uses Redux
export const argTypeSpecs = [color, containerStyle, font, seriesStyle];
