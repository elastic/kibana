/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, MouseEvent, useMemo } from 'react';
import { EuiRange } from '@elastic/eui';
import type { ProcessStartMarker } from '../../../../common/types/process_tree';
import { useStyles } from './styles';
import { PlayHead } from './play_head';

type Props = {
  processStartMarkers: ProcessStartMarker[];
  linesLength: number;
  currentLine: number;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => void;
};

type TTYPlayerLineMarker = {
  line: number;
  type: 'output' | 'data_limited';
};

export const TTYPlayerControlsMarkers = ({
  processStartMarkers,
  linesLength,
  currentLine,
  onChange,
}: Props) => {
  const styles = useStyles();

  const markers = useMemo(() => {
    if (processStartMarkers.length < 1) {
      return [];
    }
    return processStartMarkers.map(
      ({ event, line }) =>
        ({
          type:
            event.process?.io?.max_bytes_per_process_exceeded === true ? 'data_limited' : 'output',
          line,
        } as TTYPlayerLineMarker)
    );
  }, [processStartMarkers]);

  const markersLength = markers.length;
  if (!markersLength) {
    return null;
  }

  const currentSelected =
    currentLine >= markers[markersLength - 1].line
      ? markersLength - 1
      : markers.findIndex((marker) => marker.line > currentLine) - 1;

  const currentSelectedType = markers[Math.max(0, currentSelected)].type;

  return (
    <>
      <EuiRange
        value={currentLine}
        min={0}
        max={Math.max(0, linesLength - 1)}
        onChange={onChange}
        fullWidth
        showRange
        css={styles.range}
      />
      <PlayHead
        css={styles.playHead(currentSelectedType)}
        style={{ left: `${(currentLine * 100) / linesLength}%` }}
      />
      <div css={styles.markersOverlay}>
        {markers.map(({ line, type }, idx) => {
          const selected =
            currentLine >= line &&
            (idx === markersLength - 1 || currentLine < markers[idx + 1].line);

          // markers positions are absolute, setting higher z-index on the selected one in case there
          // are severals next to each other
          const style = {
            left: `${(line * 100) / linesLength}%`,
            zIndex: selected ? 3 : 2,
          };

          return (
            <button
              key={idx}
              type="button"
              value={line}
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
