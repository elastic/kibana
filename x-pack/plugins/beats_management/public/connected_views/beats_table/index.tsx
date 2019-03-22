/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten } from 'lodash';
import React, { useContext, useRef, useState } from 'react';
import { BeatTag, CMBeat } from 'x-pack/plugins/beats_management/common/domain_types';
import { BeatsTableType, Table } from '../../components/table';
import { beatsListActions, tagConfigActions } from '../../components/table/action_schema';
import { AssignmentActionType } from '../../components/table/table';
import { LibsContext } from '../../context/libs';
import { useAsyncEffect } from '../../hooks/use_async_effect';
import { useInterval } from '../../hooks/use_interval';
import { useKQLAutocomplete } from '../../hooks/use_kql_autocompletion';

interface TableOptionsState {
  searchInput?: string;
  page: number;
  size: number;
}

interface ComponentProps {
  hasSearch?: boolean;
  forAttachedTag?: string;
  options: TableOptionsState;
  onOptionsChange: (newState: TableOptionsState) => void;
  actionHandler?(action: AssignmentActionType, payload: string, selected: CMBeat[]): void;
}

export const BeatsCMTable: React.SFC<ComponentProps> = props => {
  const libs = useContext(LibsContext);

  const tableRef = useRef<any>(null);

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // reload the table every min
  useInterval(() => {
    setLastUpdate(new Date());
  }, 60000);

  const [assignmentOptions, setAssignmentOptions] = useState([] as BeatTag[]);
  const [beats, setBeats] = useState({
    list: [] as CMBeat[],
    page: 0,
    total: 0,
  });

  useAsyncEffect(
    async () => {
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

      const tags = await libs.tags.getTagsWithIds(flatten(loadedBeats.list.map(beat => beat.tags)));
      const mappedBeats = loadedBeats.list.map(beat => ({
        ...beat,
        tags: (tags || []).filter(tag => beat.tags.includes(tag.id)),
      })) as any[];

      setBeats({
        list: mappedBeats,
        total: loadedBeats.total,
        // I am not sure why, but sometimes page is returned as a string and others a number...
        page: parseInt(`${loadedBeats.page}`, 10),
      });
    },
    [lastUpdate, props.options.page, props.options.size, props.options.searchInput]
  );

  const autocompleteProps = useKQLAutocomplete(
    (...args) => libs.elasticsearch.getSuggestions(...args),
    (...args) => libs.elasticsearch.isKueryValid(...args),
    props.options.searchInput || '',
    'beat'
  );

  return (
    <Table
      pageSize={props.options.size}
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
      onTableChange={(index: number, size: number) => {
        props.onOptionsChange({
          searchInput: props.options.searchInput,
          size,
          page: index,
        });
      }}
      actions={props.forAttachedTag ? tagConfigActions : beatsListActions}
      actionData={{
        tags: assignmentOptions,
      }}
      actionHandler={async (
        action: AssignmentActionType,
        payload: string,
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
                beat =>
                  beat.tags !== undefined &&
                  ((beat.tags as any) as BeatTag[]).some(tag => tag.id === payload)
              )
            ) {
              status = await libs.beats.removeTagsFromBeats(assignments);
            } else {
              status = await libs.beats.assignTagsToBeats(assignments);
            }

            if (status && !status.find(s => !s.success)) {
              setLastUpdate(new Date());
            } else if (status && status.find(s => !s.success)) {
              // @ts-ignore
              alert(status.find(s => !s.success).error.message);
            }

            break;
          case AssignmentActionType.Delete:
            if (props.forAttachedTag) {
              await libs.beats.removeTagsFromBeats(
                libs.beats.createBeatTagAssignments(
                  selectedItems.map((beat: any) => beat.id),
                  props.forAttachedTag
                )
              );
              return setLastUpdate(new Date());
            }

            for (const beat of selectedItems) {
              await libs.beats.update(beat.id, { active: false });
            }

            // because the compile code above has a very minor race condition, we wait,
            // the max race condition time is really 10ms but doing 100 to be safe
            setTimeout(async () => {
              tableRef.current.resetSelection();
              setLastUpdate(new Date());
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
