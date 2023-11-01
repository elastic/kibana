/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';
import type { TileError } from '../../../common/descriptor_types';

interface Props {
  tileErrors: TileError[];
}

export function TileErrorsList(props: Props) {
  const [selectedTileKey, setSelectedTileKey] = useState(props.tileErrors?.[0].tileZXYKey);
  const selectedTileContent = useMemo(() => {
    const tileError = props.tileErrors.find(tileError => {
      return tileError.tileZXYKey === selectedTileKey;
    });
    return tileError
      ? <p>
          {getDescription(tileError)}
        </p>
      : null;
  }, [selectedTileKey]);
  const tabs = useMemo(() => {
    return props.tileErrors.map((tileError) => {
      return (
        <EuiTab
          key={tileError.tileZXYKey}
          onClick={() => setSelectedTileKey(tileError.tileZXYKey)}
          isSelected={tileError.tileZXYKey === selectedTileKey}
        >
          {tileError.tileZXYKey}
        </EuiTab>
      );
    });
  }, [props.tileErrors, selectedTileKey]);

  return (
    <>
      <EuiTabs size="s">{tabs}</EuiTabs>
      {selectedTileContent}
    </>
  )
  /*return (
    <div>
      {
        props.tileErrors.map((tileError) => (
          <div key={tileError.tileZXYKey}>
            <EuiAccordion
              key={tileError.tileZXYKey}
              id={tileError.tileZXYKey}
              arrowDisplay="none"
              buttonContent={i18n.translate('xpack.maps.tileErrorsList.tileTitle', {
                defaultMessage: `Tile {tileZXYKey}`,
                values: { tileZXYKey: tileError.tileZXYKey },
              })}
            >
              <p>
                {getDescription(tileError)}
              </p>
            </EuiAccordion>
            <EuiSpacer size="s" />
          </div>
        ))
      }
    </div>
  );*/
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
