/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, MouseEvent, useMemo } from 'react';
import { EuiRange, EuiToolTip } from '@elastic/eui';
import type { ProcessStartMarker } from '../../../../common/types/process_tree';
import { useStyles } from './styles';
import { PlayHead } from './play_head';

type Props = {
  processStartMarkers: ProcessStartMarker[];
  linesLength: number;
  currentLine: number;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => void;
  onSeekLine(line: number): void;
};

type TTYPlayerLineMarker = {
  line: number[];
  type: 'output' | 'data_limited';
  name: string[];
};

export const TTYPlayerControlsMarkers = ({
  processStartMarkers,
  linesLength,
  currentLine,
  onChange,
  onSeekLine,
}: Props) => {
  const progress = useMemo(() => (currentLine / linesLength) * 100, [currentLine, linesLength]);

  const styles = useStyles(progress);

  const markers = useMemo(() => {
    if (processStartMarkers.length < 1) {
      return [];
    }
    return processStartMarkers
      .map(
        ({ event, line }) =>
          ({
            type:
              event.process?.io?.max_bytes_per_process_exceeded === true
                ? 'data_limited'
                : 'output',
            line: [line, line],
            name: [event.process?.name],
          } as TTYPlayerLineMarker)
      )
      .reduce((prev, current, index) => {
        if (prev.length > 0 && prev[prev.length - 1].line[1] + 1 === current.line[0]) {
          prev[prev.length - 1].name.push(current.name[0]);
          prev[prev.length - 1].line[1] = prev[prev.length - 1].line[1] + 1;
        } else {
          prev.push(current);
        }
        return prev;
      }, [] as TTYPlayerLineMarker[]);
  }, [processStartMarkers]);

  const markersLength = markers.length;

  const currentSelectedType = useMemo(() => {
    if (!markersLength) {
      return undefined;
    }
    const currentSelected =
      currentLine >= markers[markersLength - 1].line[0]
        ? markersLength - 1
        : markers.findIndex((marker) => marker.line[0] > currentLine) - 1;

    return markers[Math.max(0, currentSelected)].type;
  }, [currentLine, markers, markersLength]);

  if (!markersLength) {
    return null;
  }

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
      <PlayHead css={styles.playHead(currentSelectedType)} />
      <div css={styles.markersOverlay}>
        {markers.map(({ line, type, name }, idx) => {
          const selected =
            currentLine >= line[0] &&
            (idx === markersLength - 1 || currentLine < markers[idx + 1].line[0]);

          // markers positions are absolute, setting higher z-index on the selected one in case there
          // are severals next to each other
          const markerWrapperPositioning = {
            left: `${(line[0] / linesLength) * 100}%`,
            zIndex: selected ? 3 : 2,
          };

          const onMarkerClick = () => onSeekLine(line[0]);

          return (
            <div key={idx} style={markerWrapperPositioning} css={styles.markerWrapper}>
              <EuiToolTip title={name.join(', ')}>
                <button
                  type="button"
                  value={line[0]}
                  tabIndex={-1}
                  title={type}
                  css={styles.marker(type, selected)}
                  onClick={onMarkerClick}
                  aria-label={name.join(', ')}
                >
                  {name.join(', ')}
                </button>
              </EuiToolTip>
            </div>
          );
        })}
      </div>
    </>
  );
};
