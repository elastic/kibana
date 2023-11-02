/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import type { TileError } from '../../../common/descriptor_types';

interface Props {
  tileErrors: TileError[];
}

export function TileErrorsList(props: Props) {
  const [selectedTileKey, setSelectedTileKey] = useState(props.tileErrors?.[0].tileKey);
  
  const selectedTileContent = useMemo(() => {
    const selectedTileError = props.tileErrors.find((tileError) => {
      return tileError.tileKey === selectedTileKey;
    });
    return selectedTileError ? <p>{getDescription(selectedTileError)}</p> : null;
  }, [props.tileErrors, selectedTileKey]);
  
  const tabs = useMemo(() => {
    return props.tileErrors.map((tileError) => {
      return (
        <EuiTab
          key={tileError.tileKey}
          onClick={() => setSelectedTileKey(tileError.tileKey)}
          isSelected={tileError.tileKey === selectedTileKey}
        >
          {tileError.tileKey}
        </EuiTab>
      );
    });
  }, [props.tileErrors, selectedTileKey]);

  return (
    <>
      <EuiTabs size="s">{tabs}</EuiTabs>
      {selectedTileContent}
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
