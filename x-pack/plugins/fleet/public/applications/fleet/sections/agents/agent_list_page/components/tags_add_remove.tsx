/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon, EuiSelectable, EuiWrappingPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { sendPutAgentTagsUpdate, useStartServices } from '../../../../hooks';

interface Props {
  agentId: string;
  allTags: string[];
  selectedTags: string[];
  button: HTMLElement;
  onTagsUpdated: () => void;
}

export const TagsAddRemove: React.FC<Props> = ({
  agentId,
  allTags,
  selectedTags,
  button,
  onTagsUpdated,
}: {
  agentId: string;
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

  const { notifications } = useStartServices();
  const [labels, setLabels] = useState<Array<EuiSelectableOption<any>>>(labelsFromTags(allTags));
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const closePopover = () => setIsPopoverOpen(false);

  // update labels after tags changing
  useEffect(() => {
    setLabels(labelsFromTags(allTags));
  }, [allTags, labelsFromTags]);

  const updateTags = async (newTags: string[]) => {
    const res = await sendPutAgentTagsUpdate(agentId, { tags: newTags });

    if (res.error) {
      const errorMessage = i18n.translate('xpack.fleet.updateAgentTags.errorNotificationTitle', {
        defaultMessage: 'Tags update failed',
      });
      notifications.toasts.addError(res.error, { title: errorMessage });
      throw res.error;
    }
    const successMessage = i18n.translate('xpack.fleet.updateAgentTags.successNotificationTitle', {
      defaultMessage: 'Tags updated',
    });
    notifications.toasts.addSuccess(successMessage);

    onTagsUpdated();
  };

  const setOptions = (newOptions: Array<EuiSelectableOption<any>>) => {
    setLabels(newOptions);

    updateTags(
      newOptions.filter((option) => option.checked === 'on').map((option) => option.label)
    );
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
              updateTags([...selectedTags, searchValue]);
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
