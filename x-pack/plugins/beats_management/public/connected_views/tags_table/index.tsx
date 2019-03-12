/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { useContext, useRef, useState } from 'react';
import { BeatTag } from 'x-pack/plugins/beats_management/common/domain_types';
import { BeatDetailTagsTable, Table, TagsTableType } from '../../components/table';
import { tagListActions } from '../../components/table/action_schema';
import { AssignmentActionType } from '../../components/table/table';
import { LibsContext } from '../../context/libs';
import { useAsyncEffect } from '../../hooks/use_async_effect';
import { useKQLAutocomplete } from '../../hooks/use_kql_autocompletion';

interface TableOptionsState {
  searchInput?: string;
  page: number;
  size: number;
}

interface ComponentProps {
  hasSearch?: boolean;
  forBeat?: string;
  options: TableOptionsState;
  onOptionsChange: (newState: TableOptionsState) => void;
  actionHandler?(action: AssignmentActionType, payload: any, selected: BeatTag[]): void;
}

export const BeatsCMTagsTable: React.SFC<ComponentProps> = props => {
  const libs = useContext(LibsContext);

  const tableRef = useRef<any>(null);
  // the value of update does not matter, we just use it to force a re-render
  // by flipping it's value back and forth for lack of a built-in forceUpdate method
  const [update, forceUpdate] = useState(true);

  const [tags, setTags] = useState({
    list: [] as BeatTag[],
    page: 0,
    total: 0,
  });

  useAsyncEffect(
    async () => {
      let loadedTags;

      if (props.forBeat) {
        loadedTags = await libs.tags.getTagsForBeat(
          props.forBeat,
          props.options.page || 0,
          props.options.size || 25
        );
        loadedTags = {
          list: [],
          total: 0,
          page: props.options.page,
        };
      } else {
        loadedTags = await libs.tags.getAll(
          props.options.searchInput,
          props.options.page || 0,
          props.options.size || 25
        );
      }

      setTags({
        list: loadedTags.list,
        total: loadedTags.total,
        // I am not sure why, but sometimes page is returned as a string and others a number...
        page: parseInt(`${loadedTags.page}`, 10),
      });
    },
    [update, props.options.page, props.options.size, props.options.searchInput]
  );

  const autocompleteProps = useKQLAutocomplete(
    (...args) => libs.elasticsearch.getSuggestions(...args),
    (...args) => libs.elasticsearch.isKueryValid(...args),
    props.options.searchInput || '',
    'tag'
  );

  const actionHandler = async (
    action: AssignmentActionType,
    payload: any,
    selectedItems: BeatTag[]
  ) => {
    if (!selectedItems.length) {
      return false;
    }

    if (action === AssignmentActionType.Delete) {
      const success = await libs.tags.delete(selectedItems.map(tag => tag.id));
      if (!success) {
        alert(
          i18n.translate('xpack.beatsManagement.tags.someTagsMightBeAssignedToBeatsTitle', {
            defaultMessage:
              'Some of these tags might be assigned to beats. Please ensure tags being removed are not activly assigned',
          })
        );
      } else {
        tableRef.current.resetSelection();

        forceUpdate(!update);
      }
    }

    if (props.actionHandler) {
      props.actionHandler(action, payload, selectedItems);
    }
  };

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
      onTableChange={(index: number, size: number) => {
        props.onOptionsChange({
          searchInput: props.options.searchInput,
          size,
          page: index,
        });
      }}
      hideTableControls={props.forBeat === undefined ? false : true}
      actions={tagListActions}
      actionHandler={actionHandler}
      items={tags}
      ref={tableRef}
      type={props.forBeat === undefined ? TagsTableType : BeatDetailTagsTable}
    />
  );
};
