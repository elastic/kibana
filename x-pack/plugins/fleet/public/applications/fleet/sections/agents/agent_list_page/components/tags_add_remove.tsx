/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { difference } from 'lodash';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon, EuiSelectable, EuiWrappingPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useUpdateTags } from '../hooks';

interface Props {
  agentId?: string;
  agents?: string[] | string;
  allTags: string[];
  selectedTags: string[];
  button: HTMLElement;
  onTagsUpdated: () => void;
}

export const TagsAddRemove: React.FC<Props> = ({
  agentId,
  agents,
  allTags,
  selectedTags,
  button,
  onTagsUpdated,
}: {
  agentId?: string;
  agents?: string[] | string;
  allTags: string[];
  selectedTags: string[];
  button: HTMLElement;
  onTagsUpdated: () => void;
}) => {
  const labelsFromTags = useCallback(
    (tags: string[]) =>
      tags.map((tag: string) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? 'on' : undefined,
      })),
    [selectedTags]
  );

  const [labels, setLabels] = useState<Array<EuiSelectableOption<any>>>(labelsFromTags(allTags));
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const closePopover = () => setIsPopoverOpen(false);

  const updateTagsHook = useUpdateTags();

  // update labels after tags changing
  useEffect(() => {
    setLabels(labelsFromTags(allTags));
  }, [allTags, labelsFromTags]);

  const updateTags = async (tagsToAdd: string[], tagsToRemove: string[]) => {
    if (agentId) {
      updateTagsHook.updateTags(
        agentId,
        difference(selectedTags, tagsToRemove).concat(tagsToAdd),
        () => onTagsUpdated()
      );
    } else {
      updateTagsHook.bulkUpdateTags(agents!, tagsToAdd, tagsToRemove, () => onTagsUpdated());
    }
  };

  const setOptions = (newOptions: Array<EuiSelectableOption<any>>) => {
    setLabels(newOptions);

    const existingCheckedTags = labels
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
    const newCheckedTags = newOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
    const tagsToAdd = difference(newCheckedTags, existingCheckedTags);
    const tagsToRemove = difference(existingCheckedTags, newCheckedTags);

    updateTags(tagsToAdd, tagsToRemove);
  };

  return (
    <EuiWrappingPopover
      isOpen={isPopoverOpen}
      button={button!}
      closePopover={closePopover}
      anchorPosition="leftUp"
    >
      <EuiSelectable
        aria-label="Add / remove tags"
        searchable
        searchProps={{
          'data-test-subj': 'addRemoveTags',
          onChange: (value: string) => {
            setSearchValue(value);
          },
        }}
        options={labels}
        onChange={(newOptions) => setOptions(newOptions)}
        noMatchesMessage={
          <EuiButtonEmpty
            color="text"
            onClick={() => {
              if (!searchValue) {
                return;
              }
              updateTags([searchValue], []);
            }}
          >
            <EuiIcon type="plus" />{' '}
            <FormattedMessage
              id="xpack.fleet.tagsAddRemove.createText"
              defaultMessage='Create a new tag "{name}"'
              values={{
                name: searchValue,
              }}
            />
          </EuiButtonEmpty>
        }
      >
        {(list, search) => (
          <Fragment>
            {search}
            {list}
          </Fragment>
        )}
      </EuiSelectable>
    </EuiWrappingPopover>
  );
};
