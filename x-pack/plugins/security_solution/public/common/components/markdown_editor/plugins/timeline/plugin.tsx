/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, memo } from 'react';
import {
  EuiSelectableOption,
  EuiModalBody,
  EuiMarkdownEditorUiPlugin,
  EuiCodeBlock,
} from '@elastic/eui';

import { TimelineType } from '../../../../../../common/types/timeline';
import { SelectableTimeline } from '../../../../../timelines/components/timeline/selectable_timeline';
import { OpenTimelineResult } from '../../../../../timelines/components/open_timeline/types';

import { ID, PREFIX } from './constants';
import * as i18n from './translations';

interface TimelineEditorProps {
  onClosePopover: () => void;
  onInsert: (markdown: string, config: { block: boolean }) => void;
}

const TimelineEditorComponent: React.FC<TimelineEditorProps> = ({ onClosePopover, onInsert }) => {
  const handleGetSelectableOptions = useCallback(
    ({ timelines }: { timelines: OpenTimelineResult[] }) => [
      ...timelines.map(
        (t: OpenTimelineResult, index: number) =>
          ({
            description: t.description,
            favorite: t.favorite,
            label: t.title,
            id: t.savedObjectId,
            key: `${t.title}-${index}`,
            title: t.title,
            checked: undefined,
          } as EuiSelectableOption)
      ),
    ],
    []
  );

  return (
    <EuiModalBody>
      <SelectableTimeline
        hideUntitled={true}
        getSelectableOptions={handleGetSelectableOptions}
        onTimelineChange={(timelineTitle, timelineId, graphEventId) => {
          onInsert(
            `${PREFIX}${JSON.stringify({
              id: timelineId,
              title: timelineTitle,
              graphEventId,
            })}}`,
            {
              block: false,
            }
          );
        }}
        onClosePopover={onClosePopover}
        timelineType={TimelineType.default}
      />
    </EuiModalBody>
  );
};

const TimelineEditor = memo(TimelineEditorComponent);

export const plugin: EuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.INSERT_TIMELINE,
    iconType: 'timeline',
  },
  helpText: (
    <EuiCodeBlock language="js" paddingSize="s" fontSize="l">
      {`${PREFIX}{"id":"Timeline id","title":"Timeline title"}}`}
    </EuiCodeBlock>
  ),
  editor: function editor({ node, onSave, onCancel }) {
    return <TimelineEditor onClosePopover={onCancel} onInsert={onSave} />;
  },
};
