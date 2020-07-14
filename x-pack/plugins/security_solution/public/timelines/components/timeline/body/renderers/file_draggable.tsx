/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';
import * as i18n from './translations';

interface Props {
  contextId: string;
  endgameFileName: string | null | undefined;
  endgameFilePath: string | null | undefined;
  eventId: string;
  fileName: string | null | undefined;
  filePath: string | null | undefined;
}

export const FileDraggable = React.memo<Props>(
  ({ contextId, endgameFileName, endgameFilePath, eventId, fileName, filePath }) => {
    if (
      isNillEmptyOrNotFinite(fileName) &&
      isNillEmptyOrNotFinite(endgameFileName) &&
      isNillEmptyOrNotFinite(filePath) &&
      isNillEmptyOrNotFinite(endgameFilePath)
    ) {
      return null;
    }

    const filePathIsKnown =
      !isNillEmptyOrNotFinite(filePath) || !isNillEmptyOrNotFinite(endgameFilePath);

    return (
      <>
        {!isNillEmptyOrNotFinite(fileName) ? (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="file.name"
              value={fileName}
              iconType="document"
            />
          </TokensFlexItem>
        ) : !isNillEmptyOrNotFinite(endgameFileName) ? (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.file_name"
              value={endgameFileName}
              iconType="document"
            />
          </TokensFlexItem>
        ) : null}

        {filePathIsKnown && (
          <TokensFlexItem data-test-subj="in" grow={false} component="span">
            {i18n.IN}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(filePath) ? (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="file.path"
              value={filePath}
              iconType="document"
            />
          </TokensFlexItem>
        ) : !isNillEmptyOrNotFinite(endgameFilePath) ? (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.file_path"
              value={endgameFilePath}
              iconType="document"
            />
          </TokensFlexItem>
        ) : null}
      </>
    );
  }
);

FileDraggable.displayName = 'FileDraggable';
