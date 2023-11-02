/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import type { TileError } from '../../../common/descriptor_types';

interface Props {
  tileErrors: TileError[];
}

export function TileErrorsList(props: Props) {
  const [selectedTileError, setSelectedTileError] = useState<TileError | undefined>(undefined);

  useEffect(() => {
    const hasSelectedTileError =
      selectedTileError &&
      props.tileErrors.some(({ tileKey }) => {
        return tileKey === selectedTileError.tileKey;
      });
    if (!hasSelectedTileError) {
      setSelectedTileError(props.tileErrors?.[0]);
    }
  }, [props.tileErrors, selectedTileError]);

  return (
    <>
      <EuiTabs size="s">
        {props.tileErrors.map((tileError) => {
          return (
            <EuiTab
              key={tileError.tileKey}
              onClick={() => {
                const nextTileError = props.tileErrors.find(({ tileKey }) => {
                  return tileKey === tileError.tileKey;
                });
                setSelectedTileError(nextTileError);
              }}
              isSelected={tileError.tileKey === selectedTileError?.tileKey}
            >
              {tileError.tileKey}
            </EuiTab>
          );
        })}
      </EuiTabs>
      {selectedTileError ? <p>{getDescription(selectedTileError)}</p> : null}
    </>
  );
}

function getDescription(tileError: TileError) {
  if (tileError.error?.root_cause?.[0]?.reason) {
    return tileError.error.root_cause[0].reason;
  }

  if (tileError.error?.reason) {
    return tileError.error.reason;
  }

  return tileError.message;
}
