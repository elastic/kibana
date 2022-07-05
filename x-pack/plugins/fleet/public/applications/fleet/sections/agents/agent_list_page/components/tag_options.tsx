/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { debounce } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiWrappingPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useUpdateTags } from '../hooks';

interface Props {
  tagName: string;
  isTagHovered: boolean;
  onTagsUpdated: () => void;
}

export const TagOptions: React.FC<Props> = ({ tagName, isTagHovered, onTagsUpdated }: Props) => {
  const [tagOptionsVisible, setTagOptionsVisible] = useState<boolean>(false);
  const [tagOptionsButton, setTagOptionsButton] = useState<HTMLElement>();

  const [updatedName, setUpdatedName] = useState<string | undefined>(tagName);

  const closePopover = () => setTagOptionsVisible(false);

  const updateTagsHook = useUpdateTags();

  const TAGS_QUERY = 'tags:{name}';

  const debouncedSendRenameTag = useMemo(
    () =>
      debounce((newName) => {
        const kuery = TAGS_QUERY.replace('{name}', tagName);
        updateTagsHook.bulkUpdateTags(kuery, [newName], [tagName], () => onTagsUpdated());
      }, 1000),
    [onTagsUpdated, tagName, updateTagsHook]
  );

  return (
    <>
      <EuiButtonIcon
        style={{ visibility: isTagHovered ? 'visible' : 'hidden' }}
        iconType="boxesHorizontal"
        aria-label={i18n.translate('xpack.fleet.tagOptions.tagOptionsToggleButtonLabel', {
          defaultMessage: 'Tag Options',
        })}
        color="text"
        onClick={(event: any) => {
          setTagOptionsButton(event.target);
          setTagOptionsVisible(!tagOptionsVisible);
        }}
      />
      {tagOptionsVisible && (
        <EuiWrappingPopover
          isOpen={true}
          button={tagOptionsButton!}
          closePopover={closePopover}
          anchorPosition="downCenter"
        >
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiFieldText
                placeholder={i18n.translate('xpack.fleet.tagOptions.nameTextFieldPlaceholder', {
                  defaultMessage: 'Enter new name for tag',
                })}
                value={updatedName}
                required
                onChange={(e: any) => {
                  const newName = e.target.value;
                  setUpdatedName(newName);
                  if (!newName) {
                    return;
                  }
                  debouncedSendRenameTag(newName);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={() => {
                  const kuery = TAGS_QUERY.replace('{name}', tagName);
                  updateTagsHook.bulkUpdateTags(kuery, [], [tagName], () => onTagsUpdated());
                  closePopover();
                }}
              >
                <EuiIcon type="trash" />{' '}
                <FormattedMessage
                  id="xpack.fleet.tagOptions.deleteText"
                  defaultMessage="Delete tag"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiWrappingPopover>
      )}
    </>
  );
};
