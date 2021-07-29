/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite } from './helpers';
import * as i18n from './translations';

interface Props {
  contextId: string;
  endgamePid: number | null | undefined;
  endgameProcessName: string | null | undefined;
  eventId: string;
  processExecutable: string | undefined | null;
  processPid: number | undefined | null;
  processName: string | undefined | null;
  isDraggable?: boolean;
}

export const ProcessDraggable = React.memo<Props>(
  ({
    contextId,
    endgamePid,
    endgameProcessName,
    eventId,
    processExecutable,
    processName,
    processPid,
    isDraggable,
  }) => {
    if (
      isNillEmptyOrNotFinite(processName) &&
      isNillEmptyOrNotFinite(processExecutable) &&
      isNillEmptyOrNotFinite(endgameProcessName) &&
      isNillEmptyOrNotFinite(processPid) &&
      isNillEmptyOrNotFinite(endgamePid)
    ) {
      return null;
    }

    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {!isNillEmptyOrNotFinite(processName) ? (
          <EuiFlexItem grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.name"
              value={processName}
              iconType="console"
              isDraggable={isDraggable}
            />
          </EuiFlexItem>
        ) : !isNillEmptyOrNotFinite(processExecutable) ? (
          <EuiFlexItem grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.executable"
              value={processExecutable}
              iconType="console"
              isDraggable={isDraggable}
            />
          </EuiFlexItem>
        ) : !isNillEmptyOrNotFinite(endgameProcessName) ? (
          <EuiFlexItem grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.process_name"
              value={endgameProcessName}
              iconType="console"
              isDraggable={isDraggable}
            />
          </EuiFlexItem>
        ) : null}

        {!isNillEmptyOrNotFinite(processPid) ? (
          <EuiFlexItem grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.pid"
              queryValue={String(processPid)}
              value={`(${String(processPid)})`}
              isDraggable={isDraggable}
            />
          </EuiFlexItem>
        ) : !isNillEmptyOrNotFinite(endgamePid) ? (
          <EuiFlexItem grow={false}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.pid"
              queryValue={String(endgamePid)}
              value={`(${String(endgamePid)})`}
              isDraggable={isDraggable}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);

ProcessDraggable.displayName = 'ProcessDraggable';

export const ProcessDraggableWithNonExistentProcess = React.memo<Props>(
  ({
    contextId,
    endgamePid,
    endgameProcessName,
    eventId,
    processExecutable,
    processName,
    processPid,
    isDraggable,
  }) => {
    if (
      endgamePid == null &&
      endgameProcessName == null &&
      processExecutable == null &&
      processName == null &&
      processPid == null
    ) {
      return <>{i18n.NON_EXISTENT}</>;
    } else {
      return (
        <ProcessDraggable
          contextId={contextId}
          endgamePid={endgamePid}
          endgameProcessName={endgameProcessName}
          eventId={eventId}
          processExecutable={processExecutable}
          processName={processName}
          processPid={processPid}
          isDraggable={isDraggable}
        />
      );
    }
  }
);

ProcessDraggableWithNonExistentProcess.displayName = 'ProcessDraggableWithNonExistentProcess';
