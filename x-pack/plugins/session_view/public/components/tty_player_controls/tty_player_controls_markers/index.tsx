/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiRange } from '@elastic/eui';
import React from 'react';
import { useStyles } from './styles';

type Markers = {
  value: number;
  type: 'output' | 'data_limited';
};

type Props = {
  markers: Markers[];
  playerLength: number;
  playerValue: number;
  onChange: any;
};

export const TTYPlayerControlsMarkers = ({
  markers,
  playerLength,
  playerValue,
  onChange,
}: Props) => {
  const styles = useStyles();

  const markersLength = markers.length;
  if (markersLength === 0) {
    return null;
  }
  const currentSelected =
    playerValue >= markers[markersLength - 1].value
      ? markersLength - 1
      : markers.findIndex((marker) => marker.value >= playerValue);
  const currentSelectedType = markers[Math.max(0, currentSelected - 1)]?.type;

  return (
    <>
      <EuiRange
        value={playerValue}
        min={0}
        max={Math.max(0, playerLength - 1)}
        onChange={onChange}
        fullWidth
        showRange
        css={styles.range}
        // {...ticksProps}
      />
      <span
        css={styles.scrubber(currentSelectedType)}
        style={{ left: `${(playerValue * 100) / playerLength}%` }}
      />
      <div css={styles.wrapper}>
        {markers.map(({ value, type }, idx) => {
          const selected =
            playerValue >= value &&
            (idx === markersLength - 1 || playerValue < markers[idx + 1].value);
          const style = {
            left: `${(value * 100) / playerLength}%`,
            zIndex: selected ? 3 : 2,
          };

          return (
            <button
              type="button"
              value={value}
              tabIndex={-1}
              title={type}
              css={styles.marker(type, selected)}
              style={style}
            >
              {type}
            </button>
          );
        })}
      </div>
    </>
  );
};
