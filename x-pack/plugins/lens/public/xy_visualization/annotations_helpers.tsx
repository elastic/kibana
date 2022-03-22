/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression_reference_lines.scss';
import React from 'react';
import { EuiFlexGroup, EuiIcon, EuiIconProps, EuiText, IconType } from '@elastic/eui';
import { Position } from '@elastic/charts';
import type { IconPosition, YAxisMode, YConfig } from '../../common/expressions';
import { hasIcon } from './xy_config_panel/shared/icon_select';
import { IconCircle, IconTriangle } from '../assets/annotation_icons';

export const LINES_MARKER_SIZE = 20;

export const computeChartMargins = (
  referenceLinePaddings: Partial<Record<Position, number>>,
  labelVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  titleVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  axesMap: Record<'left' | 'right', unknown>,
  isHorizontal: boolean
) => {
  const result: Partial<Record<Position, number>> = {};
  if (!labelVisibility?.x && !titleVisibility?.x && referenceLinePaddings.bottom) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('bottom') : 'bottom';
    result[placement] = referenceLinePaddings.bottom;
  }
  if (
    referenceLinePaddings.left &&
    (isHorizontal || (!labelVisibility?.yLeft && !titleVisibility?.yLeft))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('left') : 'left';
    result[placement] = referenceLinePaddings.left;
  }
  if (
    referenceLinePaddings.right &&
    (isHorizontal || !axesMap.right || (!labelVisibility?.yRight && !titleVisibility?.yRight))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('right') : 'right';
    result[placement] = referenceLinePaddings.right;
  }
  // there's no top axis, so just check if a margin has been computed
  if (referenceLinePaddings.top) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('top') : 'top';
    result[placement] = referenceLinePaddings.top;
  }
  return result;
};

// Note: it does not take into consideration whether the reference line is in view or not

export const getLinesCausedPaddings = (
  visualConfigs: Array<
    Pick<YConfig, 'axisMode' | 'icon' | 'iconPosition' | 'textVisibility'> | undefined
  >,
  axesMap: Record<'left' | 'right', unknown>
) => {
  // collect all paddings for the 4 axis: if any text is detected double it.
  const paddings: Partial<Record<Position, number>> = {};
  const icons: Partial<Record<Position, number>> = {};
  visualConfigs?.forEach((config) => {
    if (!config) {
      return;
    }
    const { axisMode, icon, iconPosition, textVisibility } = config;
    if (axisMode && (hasIcon(icon) || textVisibility)) {
      const placement = getBaseIconPlacement(iconPosition, axesMap, axisMode);
      paddings[placement] = Math.max(
        paddings[placement] || 0,
        LINES_MARKER_SIZE * (textVisibility ? 2 : 1) // double the padding size if there's text
      );
      icons[placement] = (icons[placement] || 0) + (hasIcon(icon) ? 1 : 0);
    }
  });
  // post-process the padding based on the icon presence:
  // if no icon is present for the placement, just reduce the padding
  (Object.keys(paddings) as Position[]).forEach((placement) => {
    if (!icons[placement]) {
      paddings[placement] = LINES_MARKER_SIZE;
    }
  });
  return paddings;
};

export function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
export function getBaseIconPlacement(
  iconPosition: IconPosition | undefined,
  axesMap?: Record<string, unknown>,
  axisMode?: YAxisMode
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axesMap) {
      if (axisMode === 'left') {
        return axesMap.right ? Position.Left : Position.Right;
      }
      return axesMap.left ? Position.Right : Position.Left;
    }
  }

  if (iconPosition === 'left') {
    return Position.Left;
  }
  if (iconPosition === 'right') {
    return Position.Right;
  }
  if (iconPosition === 'below') {
    return Position.Bottom;
  }
  return Position.Top;
}

export function MarkerBody({
  label,
  isHorizontal,
}: {
  label: string | undefined;
  isHorizontal: boolean;
}) {
  if (!label) {
    return null;
  }
  if (isHorizontal) {
    return (
      <div className="eui-textTruncate" style={{ maxWidth: LINES_MARKER_SIZE * 3 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      className="lnsXyDecorationRotatedWrapper"
      style={{
        width: LINES_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate lnsXyDecorationRotatedWrapper__label"
        style={{
          maxWidth: LINES_MARKER_SIZE * 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

const isNumericalString = (value: string) => !isNaN(Number(value));

const shapes = ['circle', 'triangle'] as const;
type Shape = typeof shapes[number];

const shapesIconMap: Record<Shape, { icon: IconType; shouldRotate?: boolean }> = {
  triangle: { icon: IconTriangle, shouldRotate: true },
  circle: { icon: IconCircle },
};

const isCustomAnnotationShape = (value: string): value is Shape => shapes.includes(value as Shape);

function NumberIcon({ number }: { number: number }) {
  return (
    <EuiFlexGroup
      justifyContent="spaceAround"
      className="lnsXyAnnotationNumberIcon"
      gutterSize="none"
      alignItems="center"
    >
      <EuiText color="ghost" className="lnsXyAnnotationNumberIcon__text">
        {number < 10 ? number : `9+`}
      </EuiText>
    </EuiFlexGroup>
  );
}

interface MarkerConfig {
  axisMode?: YAxisMode;
  icon?: string;
  textVisibility?: boolean;
  iconPosition?: IconPosition;
}

export const getIconRotationClass = (markerPosition?: string) => {
  if (markerPosition === 'left') {
    return 'lnsXyAnnotationIcon_rotate270';
  }
  if (markerPosition === 'right') {
    return 'lnsXyAnnotationIcon_rotate90';
  }
  if (markerPosition === 'bottom') {
    return 'lnsXyAnnotationIcon_rotate180';
  }
};

export const AnnotationIcon = ({
  type,
  rotationClass = '',
  isHorizontal,
  ...rest
}: {
  type: string;
  rotationClass?: string;
  isHorizontal?: boolean;
} & EuiIconProps) => {
  if (isNumericalString(type)) {
    return <NumberIcon number={Number(type)} />;
  }
  const isCustom = isCustomAnnotationShape(type);
  if (!isCustom) {
    return <EuiIcon {...rest} type={type} />;
  }

  const rotationClassName = shapesIconMap[type].shouldRotate ? rotationClass : '';
  return <EuiIcon {...rest} type={shapesIconMap[type].icon} className={rotationClassName} />;
};

export function Marker({
  config,
  isHorizontal,
  hasReducedPadding,
  label,
  rotationClass,
}: {
  config: MarkerConfig;
  isHorizontal: boolean;
  hasReducedPadding: boolean;
  label?: string;
  rotationClass?: string;
}) {
  if (hasIcon(config.icon)) {
    return <AnnotationIcon type={config.icon} rotationClass={rotationClass} />;
  }

  // if there's some text, check whether to show it as marker, or just show some padding for the icon
  if (config.textVisibility) {
    if (hasReducedPadding) {
      return <MarkerBody label={label} isHorizontal={isHorizontal} />;
    }
    return <EuiIcon type="empty" />;
  }
  return null;
}
