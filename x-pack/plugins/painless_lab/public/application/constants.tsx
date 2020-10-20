/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultLabel = i18n.translate('xpack.painlessLab.contextDefaultLabel', {
  defaultMessage: 'Basic',
});

const filterLabel = i18n.translate('xpack.painlessLab.contextFilterLabel', {
  defaultMessage: 'Filter',
});

const scoreLabel = i18n.translate('xpack.painlessLab.contextScoreLabel', {
  defaultMessage: 'Score',
});

export const painlessContextOptions = [
  {
    value: 'painless_test',
    inputDisplay: defaultLabel,
    'data-test-subj': 'basicButtonDropdown',
    dropdownDisplay: (
      <>
        <strong>{defaultLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            {i18n.translate('xpack.painlessLab.context.defaultLabel', {
              defaultMessage: 'The script result will be converted to a string',
            })}
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'filter',
    inputDisplay: filterLabel,
    'data-test-subj': 'filterButtonDropdown',
    dropdownDisplay: (
      <>
        <strong>{filterLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            {i18n.translate('xpack.painlessLab.context.filterLabel', {
              defaultMessage: "Use the context of a filter's script query",
            })}
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'score',
    inputDisplay: scoreLabel,
    'data-test-subj': 'scoreButtonDropdown',
    dropdownDisplay: (
      <>
        <strong>{scoreLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            {i18n.translate('xpack.painlessLab.context.scoreLabel', {
              defaultMessage: 'Use the context of a script_score function in function_score query',
            })}
          </p>
        </EuiText>
      </>
    ),
  },
];

// Render a smiley face as an example.
export const exampleScript = `boolean isInCircle(def posX, def posY, def circleX, def circleY, def radius) {
  double distanceFromCircleCenter = Math.sqrt(Math.pow(circleX - posX, 2) + Math.pow(circleY - posY, 2));
  return distanceFromCircleCenter <= radius;
}

boolean isOnCircle(def posX, def posY, def circleX, def circleY, def radius, def thickness, def squashY) {
  double distanceFromCircleCenter = Math.sqrt(Math.pow(circleX - posX, 2) + Math.pow((circleY - posY) / squashY, 2));
  return (
    distanceFromCircleCenter >= radius - thickness
    && distanceFromCircleCenter <= radius + thickness
  );
}

def result = '';
int charCount = 0;

// Canvas dimensions
int width = 31;
int height = 31;
double halfWidth = Math.floor(width * 0.5);
double halfHeight = Math.floor(height * 0.5);

// Style constants
double strokeWidth = 0.6;

// Smiley face configuration
int headSize = 13;
double headSquashY = 0.78;
int eyePositionX = 10;
int eyePositionY = 12;
int eyeSize = 1;
int mouthSize = 15;
int mouthPositionX = width / 2;
int mouthPositionY = 5;
int mouthOffsetY = 11;

for (int y = 0; y < height; y++) {
  for (int x = 0; x < width; x++) {
    boolean isHead = isOnCircle(x, y, halfWidth, halfHeight, headSize, strokeWidth, headSquashY);
    boolean isLeftEye = isInCircle(x, y, eyePositionX, eyePositionY, eyeSize);
    boolean isRightEye = isInCircle(x, y, width - eyePositionX - 1, eyePositionY, eyeSize);
    boolean isMouth = isOnCircle(x, y, mouthPositionX, mouthPositionY, mouthSize, strokeWidth, 1) && y > mouthPositionY + mouthOffsetY;

    if (isLeftEye || isRightEye || isMouth || isHead) {
      result += "*";
    } else {
      result += ".";
    }

    result += " ";

    // Make sure the smiley face doesn't deform as the container changes width.
    charCount++;
    if (charCount % width === 0) {
      result += "\\\\n";
    }
  }
}

return result;`;
