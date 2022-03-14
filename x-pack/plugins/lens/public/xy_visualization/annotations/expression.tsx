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
import type { IconPosition, YAxisMode, XYAnnotationLayerConfig } from '../../../common/expressions';
import { hasIcon } from '../xy_config_panel/shared/icon_select';

export const ANNOTATIONS_MARKER_SIZE = 20;

function getBaseIconPlacement(iconPosition?: IconPosition) {
  return iconPosition === 'below' ? Position.Bottom : Position.Top;
}

function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
  }
}

function MarkerBody({ label, isHorizontal }: { label: string | undefined; isHorizontal: boolean }) {
  if (!label) {
    return null;
  }
  if (isHorizontal) {
    return (
      <div className="eui-textTruncate" style={{ maxWidth: ANNOTATIONS_MARKER_SIZE * 3 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      className="lnsXyDecorationRotatedWrapper"
      style={{
        width: ANNOTATIONS_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate lnsXyDecorationRotatedWrapper__label"
        style={{
          maxWidth: ANNOTATIONS_MARKER_SIZE * 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface MarkerConfig {
  axisMode?: YAxisMode;
  icon?: string;
  textVisibility?: boolean;
}

function Marker({
  config,
  label,
  isHorizontal,
  hasReducedPadding,
}: {
  config: MarkerConfig;
  label: string | undefined;
  isHorizontal: boolean;
  hasReducedPadding: boolean;
}) {
  // show an icon if present
  if (hasIcon(config.icon)) {
    return <EuiIcon type={config.icon} />;
  }
  // if there's some text, check whether to show it as marker, or just show some padding for the icon
  if (config.textVisibility) {
    if (hasReducedPadding) {
      return <MarkerBody label={label} isHorizontal={!isHorizontal} />;
    }
    return <EuiIcon type="empty" />;
  }
  return null;
}

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
}

type CollectiveConfig = AnnotationConfig & {
  roundedTimestamp: number;
  layerId: string;
  hide: boolean;
  customTooltipDetails: AnnotationTooltipFormatter | undefined;
};

const groupVisibleConfigsByInterval = (
  layers: XYAnnotationLayerConfig[],
  minInterval?: number,
  firstTimestamp?: number,
  isBarChart?: boolean
) => {
  return layers
    .flatMap(({ config: configs, layerId, hide }) =>
      configs
        .filter((config) => !config.isHidden)
        .map((config) => ({
          ...config,
          roundedTimestamp: getRoundedTimestamp(
            Number(config.key.timestamp),
            firstTimestamp,
            minInterval,
            isBarChart
          ),
          layerId,
          hide,
        }))
    )
    .reduce<Record<string, CollectiveConfig[]>>(
      (acc, current) => ({
        ...acc,
        [current.roundedTimestamp]: acc[current.roundedTimestamp]
          ? [...acc[current.roundedTimestamp], current]
          : [current],
      }),
      {}
    );
};

const createCustomTooltipDetails =
  (config: CollectiveConfig[], formatter?: FieldFormat): AnnotationTooltipFormatter | undefined =>
  () => {
    return (
      <div>
        {config.map(({ icon, label, key }) => (
          <div className="echTooltip__item--container">
            <span className="echTooltip__label">
              {hasIcon(icon) ? <EuiIcon type={icon} /> : null}
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
  return Object.entries(visibleGroupedConfigs).map(([, configArr]) => {
    let collectiveConfig = configArr[0];
    if (configArr.length > 1) {
      collectiveConfig = {
        ...collectiveConfig,
        iconPosition: Position.Top as IconPosition,
        textVisibility: false,
        icon: !collectiveConfig.hide ? 'checkInCircleFilled' : undefined,
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
}: AnnotationsProps) => {
  return (
    <>
      {collectiveAnnotationConfigs.map((config) => {
        const markerPositionVertical = getBaseIconPlacement(config.iconPosition);
        const hasReducedPadding = paddingMap[markerPositionVertical] === ANNOTATIONS_MARKER_SIZE;
        const { label, roundedTimestamp, customTooltipDetails } = config;
        return (
          <LineAnnotation
            id={`${config.id}-line`}
            key={`${config.id}-line`}
            domainType={AnnotationDomainType.XDomain}
            marker={<Marker {...{ config, label, isHorizontal, hasReducedPadding }} />}
            markerBody={
              <MarkerBody
                label={config.textVisibility && !hasReducedPadding ? label : undefined}
                isHorizontal={!isHorizontal}
              />
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
                details: label,
              },
            ]}
            customTooltipDetails={customTooltipDetails}
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
