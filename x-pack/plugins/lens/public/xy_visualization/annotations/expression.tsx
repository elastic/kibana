/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import {
  AnnotationDomainType,
  AnnotationTooltipFormatter,
  LineAnnotation,
  Position,
} from '@elastic/charts';
import type { FieldFormat } from 'src/plugins/field_formats/common';
import { AnnotationConfig } from 'src/plugins/event_annotation/common';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';
import type { IconPosition, XYAnnotationLayerConfig } from '../../../common/expressions';
import { hasIcon } from '../xy_config_panel/shared/icon_select';
import {
  getBaseIconPlacement,
  mapVerticalToHorizontalPlacement,
  LINES_MARKER_SIZE,
  MarkerBody,
  Marker,
} from '../annotations_helpers';

const getRoundedTimestamp = (
  timestamp: number,
  firstTimestamp?: number,
  minInterval?: number,
  isBarChart?: boolean
) => {
  if (!firstTimestamp || !minInterval) {
    return timestamp;
  }
  const roundedTimestamp = timestamp - ((timestamp - firstTimestamp) % minInterval);
  return isBarChart ? roundedTimestamp + minInterval / 2 : roundedTimestamp;
};

export interface AnnotationsProps {
  collectiveAnnotationConfigs: CollectiveConfig[];
  formatter?: FieldFormat;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  hide?: boolean;
}

interface CollectiveConfig extends AnnotationConfig {
  roundedTimestamp: number;
  customTooltipDetails?: AnnotationTooltipFormatter | undefined;
}

const groupVisibleConfigsByInterval = (
  layers: XYAnnotationLayerConfig[],
  minInterval?: number,
  firstTimestamp?: number,
  isBarChart?: boolean
) => {
  return layers
    .flatMap(({ config: configs }) => configs.filter((config) => !config.isHidden))
    .reduce<Record<string, AnnotationConfig[]>>((acc, current) => {
      const roundedTimestamp = getRoundedTimestamp(
        Number(current.key.timestamp),
        firstTimestamp,
        minInterval,
        isBarChart
      );
      return {
        ...acc,
        [roundedTimestamp]: acc[roundedTimestamp] ? [...acc[roundedTimestamp], current] : [current],
      };
    }, {});
};

const createCustomTooltipDetails =
  (config: AnnotationConfig[], formatter?: FieldFormat): AnnotationTooltipFormatter | undefined =>
  () => {
    return (
      <div>
        {config.map(({ icon, label, key, color }) => (
          <div className="echTooltip__item--container">
            <span className="echTooltip__label">
              {hasIcon(icon) ? <EuiIcon type={icon} color={color} /> : null}
              {label}
            </span>
            <span className="echTooltip__value">
              {formatter?.convert(key.timestamp) || String(key.timestamp)}
            </span>
          </div>
        ))}
      </div>
    );
  };

function getCommonProperty<T, K extends keyof AnnotationConfig>(
  configArr: AnnotationConfig[],
  propertyName: K,
  fallbackValue: T
) {
  const firstStyle = configArr[0][propertyName];
  if (configArr.every((config) => firstStyle === config[propertyName])) {
    return firstStyle;
  }
  return fallbackValue;
}

const getCommonStyles = (configArr: AnnotationConfig[]) => {
  return {
    color: getCommonProperty<AnnotationConfig['color'], 'color'>(
      configArr,
      'color',
      defaultAnnotationColor
    ),
    lineWidth: getCommonProperty(configArr, 'lineWidth', 1),
    lineStyle: getCommonProperty(configArr, 'lineStyle', 'solid'),
    iconPosition: getCommonProperty(configArr, 'iconPosition', Position.Top as IconPosition),
    label: getCommonProperty(configArr, 'label', ''),
    textVisibility: getCommonProperty(configArr, 'textVisibility', false),
  };
};

export const getCollectiveConfigsByInterval = (
  layers: XYAnnotationLayerConfig[],
  minInterval?: number,
  firstTimestamp?: number,
  isBarChart?: boolean,
  formatter?: FieldFormat
) => {
  const visibleGroupedConfigs = groupVisibleConfigsByInterval(
    layers,
    minInterval,
    firstTimestamp,
    isBarChart
  );
  let collectiveConfig: CollectiveConfig;
  return Object.entries(visibleGroupedConfigs).map(([roundedTimestamp, configArr]) => {
    collectiveConfig = { ...configArr[0], roundedTimestamp: Number(roundedTimestamp) };
    if (configArr.length > 1) {
      const commonStyles = getCommonStyles(configArr);
      collectiveConfig = {
        ...collectiveConfig,
        ...commonStyles,
        icon: String(configArr.length),
        customTooltipDetails: createCustomTooltipDetails(configArr, formatter),
      };
    }
    return collectiveConfig;
  });
};

export const Annotations = ({
  collectiveAnnotationConfigs,
  formatter,
  isHorizontal,
  paddingMap,
  hide,
}: AnnotationsProps) => {
  return (
    <>
      {collectiveAnnotationConfigs.map((config) => {
        const { roundedTimestamp } = config;
        const markerPositionVertical = getBaseIconPlacement(config.iconPosition);
        const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;
        const id = `${config.id}-line`;
        return (
          <LineAnnotation
            id={id}
            key={id}
            domainType={AnnotationDomainType.XDomain}
            marker={
              !hide ? (
                <Marker
                  {...{
                    config,
                    isHorizontal: !isHorizontal,
                    hasReducedPadding,
                    label: config.label,
                  }}
                />
              ) : undefined
            }
            markerBody={
              !hide ? (
                <MarkerBody
                  label={config.textVisibility && !hasReducedPadding ? config.label : undefined}
                  isHorizontal={!isHorizontal}
                />
              ) : undefined
            }
            markerPosition={
              isHorizontal
                ? mapVerticalToHorizontalPlacement(markerPositionVertical)
                : markerPositionVertical
            }
            dataValues={[
              {
                dataValue: Number(roundedTimestamp),
                header: formatter?.convert(roundedTimestamp) || String(roundedTimestamp),
                details: config.label,
              },
            ]}
            customTooltipDetails={config.customTooltipDetails}
            style={{
              line: {
                strokeWidth: config.lineWidth || 1,
                stroke: config.color || defaultAnnotationColor,
                dash:
                  config.lineStyle === 'dashed'
                    ? [(config.lineWidth || 1) * 3, config.lineWidth || 1]
                    : config.lineStyle === 'dotted'
                    ? [config.lineWidth || 1, config.lineWidth || 1]
                    : undefined,
                opacity: 1,
              },
            }}
          />
        );
      })}
    </>
  );
};
