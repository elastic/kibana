/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { BeatTag, CMBeat } from 'x-pack/plugins/beats_management/common/domain_types';
import { BeatsTableType, Table } from '../../components/table';
import { beatsListActions } from '../../components/table/action_schema';
import { AssignmentActionType } from '../../components/table/table';
import { useComposedLibs } from '../../hooks/use_composed_libs';
import { useKQLAutocomplete } from '../../hooks/use_kql_autocompletion';

interface TableOptionsState {
  searchInput: string;
  page: number;
  size: number;
}

interface ComponentProps {
  hasSearch?: boolean;
  forAttachedTag?: string;
  options: TableOptionsState;
  onOptionsChange: (newState: TableOptionsState) => void;
  actionHandler?(action: AssignmentActionType, payload: any, selected: CMBeat[]): void;
}

export const BeatsCMTable: React.SFC<ComponentProps> = props => {
  const libs = useComposedLibs();
  const tableRef = useRef(null);
  const [update, forceUpdate] = useState(true);

  const [assignmentOptions, setAssignmentOptions] = useState([] as BeatTag[]);
  const [beats, setBeats] = useState({
    list: [] as CMBeat[],
    page: 0,
    total: 0,
  });

  useEffect(
    () => {
      const load = async () => {
        let loadedBeats;

        if (props.forAttachedTag) {
          loadedBeats = await libs.beats.getBeatsWithTag(
            props.forAttachedTag,
            props.options.page || 0,
            props.options.size || 25
          );
        } else {
          loadedBeats = await libs.beats.getAll(
            props.options.searchInput,
            props.options.page || 0,
            props.options.size || 25
          );
        }

        const tags = await libs.tags.getTagsWithIds(
          flatten(loadedBeats.list.map(beat => beat.tags))
        );

        setBeats({
          list: beats.list.map(beat => ({
            ...beat,
            tags: (tags || []).filter(tag => beat.tags.includes(tag.id)),
          })) as any[],
          total: beats.total,
          page: beats.page,
        });
      };
      load();
    },
    [update, props.options.page, props.options.size, props.options.searchInput]
  );

  const autocompleteProps = useKQLAutocomplete(
    libs.elasticsearch.getSuggestions,
    libs.elasticsearch.isKueryValid,
    props.options.searchInput,
    'beat'
  );

  return (
    <Table
      kueryBarProps={
        props.hasSearch
          ? {
              ...autocompleteProps,
              onChange: (value: any) => {
                props.onOptionsChange({ ...props.options, searchInput: value });
              },
            }
          : undefined
      }
      actions={beatsListActions}
      actionData={{
        tags: assignmentOptions,
      }}
      actionHandler={async (
        action: AssignmentActionType,
        payload: any,
        selectedItems: CMBeat[]
      ) => {
        if (!selectedItems.length) {
          return false;
        }

        switch (action) {
          case AssignmentActionType.Assign:
            const assignments = libs.beats.createBeatTagAssignments(selectedItems, payload);

            let status;
            if (
              selectedItems.some(
                beat => beat.tags !== undefined && beat.tags.some(id => id === payload)
              )
            ) {
              status = await libs.beats.assignTagsToBeats(assignments);
            } else {
              status = await libs.beats.assignTagsToBeats(assignments);
            }

            if (status && !status.find(s => !s.success)) {
              forceUpdate(!!update);
            } else if (status && status.find(s => !s.success)) {
              // @ts-ignore
              alert(status.find(s => !s.success).error.message);
            }

            break;
          case AssignmentActionType.Delete:
            for (const beat of selectedItems) {
              await libs.beats.update(beat.id, { active: false });
            }

            // because the compile code above has a very minor race condition, we wait,
            // the max race condition time is really 10ms but doing 100 to be safe
            setTimeout(async () => {
              forceUpdate(!!update);
            }, 100);
            break;
          case AssignmentActionType.Reload:
            setAssignmentOptions(await libs.tags.getassignableTagsForBeats(selectedItems));
            break;
        }

        if (props.actionHandler) {
          props.actionHandler(action, payload, selectedItems);
        }
      }}
      items={beats}
      ref={tableRef}
      type={BeatsTableType}
    />
  );
};
