/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiCodeBlock, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { TileError } from '../../../common/descriptor_types';
import { getInspector } from '../../kibana_services';
import { RESPONSE_VIEW_ID } from '../../inspector/vector_tile_adapter/components/vector_tile_inspector';

interface Props {
  inspectorAdapters: Adapters;
  isESSource: boolean;
  layerId: string;
  tileErrors: TileError[];
}

export function TileErrorsList(props: Props) {
  const [selectedTileError, setSelectedTileError] = useState<TileError | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

  if (props.tileErrors.length === 0 || !selectedTileError) {
    return null;
  }

  const panels = [
    {
      id: 0,
      items: props.tileErrors.map((tileError) => {
        return {
          name: getTitle(tileError.tileKey),
          onClick: () => {
            const nextTileError = props.tileErrors.find(({ tileKey }) => {
              return tileKey === tileError.tileKey;
            });
            setSelectedTileError(nextTileError);
            setIsPopoverOpen(false);
          },
        };
      }),
    },
  ];

  return (
    <>
      <EuiPopover
        id="tileErrorsPopover"
        button={
          <EuiButtonEmpty
            flush="left"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
            size="s"
          >
            {getTitle(selectedTileError.tileKey)}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => {
          setIsPopoverOpen(false);
        }}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
      </EuiPopover>
      <EuiCodeBlock isCopyable={true} paddingSize="s">
        {getDescription(selectedTileError)}
      </EuiCodeBlock>
      {props.isESSource && (
        <EuiButton
          color="primary"
          onClick={() => {
            getInspector().open(props.inspectorAdapters, {
              options: {
                initialLayerId: props.layerId,
                initialTileKey: selectedTileError?.tileKey,
                initialTab: [RESPONSE_VIEW_ID],
              },
            });
          }}
          size="s"
        >
          {i18n.translate('xpack.maps.tileError.viewDetailsButtonLabel', {
            defaultMessage: 'View details',
          })}
        </EuiButton>
      )}
    </>
  );
}

function getTitle(tileKey: string) {
  return i18n.translate('xpack.maps.tileError.title', {
    defaultMessage: `tile {tileKey}`,
    values: { tileKey },
  });
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
