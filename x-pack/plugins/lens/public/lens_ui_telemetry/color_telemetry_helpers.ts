/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColorMapping, NeutralPalette, DEFAULT_OTHER_ASSIGNMENT_INDEX } from '@kbn/coloring';
import { isEqual } from 'lodash';
import { nonNullable } from '../utils';

const COLOR_MAPPING_PREFIX = 'lens_color_mapping_';

export const getColorMappingTelemetryEvents = (
  colorMapping: ColorMapping.Config | undefined,
  prevColorMapping?: ColorMapping.Config
) => {
  if (!colorMapping || isEqual(colorMapping, prevColorMapping)) {
    return [];
  }

  const { assignments, specialAssignments, colorMode, paletteId } = colorMapping;
  const {
    assignments: prevAssignments,
    specialAssignments: prevSpecialAssignments,
    colorMode: prevColorMode,
    paletteId: prevPaletteId,
  } = prevColorMapping || {};

  const paletteData = prevPaletteId !== paletteId ? `palette_${paletteId}` : undefined;

  const gradientData =
    colorMode.type === 'gradient' && prevColorMode?.type !== 'gradient' ? `gradient` : undefined;

  const unassignedTermsType = getUnassignedTermsType(specialAssignments, prevSpecialAssignments);

  const diffData = [gradientData, paletteData, unassignedTermsType].filter(nonNullable);

  if (assignments.length > 0) {
    const colorCount =
      assignments.length && !isEqual(assignments, prevAssignments)
        ? `colors_${getRangeText(assignments.length)}`
        : undefined;

    const prevCustomColors = prevAssignments?.filter((a) => a.color.type === 'colorCode');
    const customColors = assignments.filter((a) => a.color.type === 'colorCode');
    const customColorEvent =
      customColors.length && !isEqual(prevCustomColors, customColors)
        ? `custom_colors_${getRangeText(customColors.length, 1)}`
        : undefined;

    const avgTermsPerColor = getAvgCountTermsPerColor(assignments, prevAssignments);

    diffData.push(...[colorCount, customColorEvent, avgTermsPerColor].filter(nonNullable));
  }
  return diffData.map(constructName);
};

const constructName = (eventName: string) => `${COLOR_MAPPING_PREFIX}${eventName}`;

function getRangeText(n: number, min = 2, max = 16) {
  if (n >= min && (n === 1 || n === 2)) {
    return String(n);
  }
  if (n <= min) {
    return `up_to_${min}`;
  } else if (n > max) {
    return `above_${max}`;
  }
  const upperBound = Math.pow(2, Math.ceil(Math.log2(n)));
  const lowerBound = upperBound / 2;
  return `${lowerBound}_to_${upperBound}`;
}

const getUnassignedTermsType = (
  specialAssignments: ColorMapping.Config['specialAssignments'],
  prevSpecialAssignments?: ColorMapping.Config['specialAssignments']
) => {
  return !isEqual(prevSpecialAssignments, specialAssignments)
    ? `unassigned_terms_${
        specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX]?.color.type === 'colorCode'
          ? 'custom'
          : specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX]?.color.type === 'loop'
          ? 'loop'
          : specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX]?.color.paletteId ===
            NeutralPalette.id
          ? NeutralPalette.id
          : 'palette'
      }`
    : undefined;
};

const getTotalTermsCount = (assignments: ColorMapping.Config['assignments']) =>
  assignments.reduce(
    (acc, cur) => ('values' in cur.rule ? acc + cur.rule.values.length : acc + 1),
    0
  );

const getAvgCountTermsPerColor = (
  assignments: ColorMapping.Config['assignments'],
  prevAssignments?: ColorMapping.Config['assignments']
) => {
  const prevTermsCount = prevAssignments && getTotalTermsCount(prevAssignments);
  const termsCount = assignments && getTotalTermsCount(assignments);
  return termsCount && prevTermsCount !== termsCount
    ? `avg_count_terms_per_color_${getRangeText(termsCount / assignments.length, 1, 4)}`
    : undefined;
};
