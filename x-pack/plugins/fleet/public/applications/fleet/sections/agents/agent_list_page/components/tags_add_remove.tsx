/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { difference } from 'lodash';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiSelectable,
  EuiWrappingPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useUpdateTags } from '../hooks';

import { TagOptions } from './tag_options';

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
}: Props) => {
  const labelsFromTags = useCallback(
    (tags: string[]) =>
      tags.map((tag: string) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? 'on' : undefined,
        onFocusBadge: false,
      })),
    [selectedTags]
  );

  const [labels, setLabels] = useState<Array<EuiSelectableOption<any>>>(labelsFromTags(allTags));
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const [isTagHovered, setIsTagHovered] = useState<{ [tagName: string]: boolean }>({});
  const closePopover = () => setIsPopoverOpen(false);

  const updateTagsHook = useUpdateTags();

  // update labels after tags changing
  useEffect(() => {
    setLabels(labelsFromTags(allTags));
  }, [allTags, labelsFromTags]);

  const updateTags = async (
    tagsToAdd: string[],
    tagsToRemove: string[],
    successMessage?: string,
    errorMessage?: string
  ) => {
    if (agentId) {
      updateTagsHook.updateTags(
        agentId,
        difference(selectedTags, tagsToRemove).concat(tagsToAdd),
        () => onTagsUpdated(),
        successMessage,
        errorMessage
      );
    } else {
      updateTagsHook.bulkUpdateTags(
        agents!,
        tagsToAdd,
        tagsToRemove,
        () => onTagsUpdated(),
        successMessage,
        errorMessage
      );
    }
  };

  const renderOption = (option: EuiSelectableOption<any>, search: string) => {
    return (
      <EuiFlexGroup
        onMouseEnter={() => setIsTagHovered({ ...isTagHovered, [option.label]: true })}
        onMouseLeave={() => setIsTagHovered({ ...isTagHovered, [option.label]: false })}
      >
        <EuiFlexItem>
          <EuiHighlight
            search={search}
            onClick={() => {
              const tagsToAdd = option.checked === 'on' ? [] : [option.label];
              const tagsToRemove = option.checked === 'on' ? [option.label] : [];
              updateTags(tagsToAdd, tagsToRemove);
            }}
          >
            {option.label}
          </EuiHighlight>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TagOptions
            tagName={option.label}
            isTagHovered={isTagHovered[option.label]}
            onTagsUpdated={onTagsUpdated}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <EuiWrappingPopover
        isOpen={isPopoverOpen}
        button={button!}
        closePopover={closePopover}
        anchorPosition="leftUp"
      >
        <EuiSelectable
          aria-label={i18n.translate('xpack.fleet.tagsAddRemove.selectableTagsLabel', {
            defaultMessage: 'Add / remove tags',
          })}
          searchable
          searchProps={{
            'data-test-subj': 'addRemoveTags',
            placeholder: i18n.translate('xpack.fleet.tagsAddRemove.findOrCreatePlaceholder', {
              defaultMessage: 'Find or create label...',
            }),
            onChange: (value: string) => {
              setSearchValue(value);
            },
          }}
          options={labels}
          renderOption={renderOption}
          noMatchesMessage={
            <EuiButtonEmpty
              color="text"
              onClick={() => {
                if (!searchValue) {
                  return;
                }
                updateTags(
                  [searchValue],
                  [],
                  i18n.translate('xpack.fleet.createAgentTags.successNotificationTitle', {
                    defaultMessage: 'Tag created',
                  }),
                  i18n.translate('xpack.fleet.createAgentTags.errorNotificationTitle', {
                    defaultMessage: 'Tag creation failed',
                  })
                );
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
    </>
  );
};
