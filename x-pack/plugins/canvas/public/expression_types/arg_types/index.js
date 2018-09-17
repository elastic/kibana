/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { color } from './color';
import { containerStyle } from './container_style';
import { font } from './font';
import { seriesStyle } from './series_style';
import { visualizeSelect } from './visualize_select';

// Anything that uses the color picker has to be loaded privately because the color picker uses Redux
export const argTypeSpecs = [color, containerStyle, font, seriesStyle, visualizeSelect];
