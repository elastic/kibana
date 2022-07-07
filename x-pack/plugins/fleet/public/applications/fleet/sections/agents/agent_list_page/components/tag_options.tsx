/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiButton,
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

  const [tagMenuButtonVisible, setTagMenuButtonVisible] = useState<boolean>(isTagHovered);

  useEffect(() => {
    setTagMenuButtonVisible(isTagHovered || tagOptionsVisible);
  }, [isTagHovered, tagOptionsVisible]);

  const [updatedName, setUpdatedName] = useState<string | undefined>(tagName);

  useEffect(() => {
    setUpdatedName(tagName);
  }, [tagName]);

  const closePopover = () => setTagOptionsVisible(false);

  const updateTagsHook = useUpdateTags();
  const bulkUpdateTags = updateTagsHook.bulkUpdateTags;

  const TAGS_QUERY = 'tags:{name}';

  const handleRename = (newName: string) => {
    const kuery = TAGS_QUERY.replace('{name}', tagName);
    bulkUpdateTags(kuery, [newName], [tagName], () => onTagsUpdated());
  };

  const handleDelete = () => {
    const kuery = TAGS_QUERY.replace('{name}', tagName);
    updateTagsHook.bulkUpdateTags(kuery, [], [tagName], () => onTagsUpdated());
  };

  return (
    <>
      {tagMenuButtonVisible && (
        <EuiButtonIcon
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
      )}
      {tagOptionsVisible && (
        <EuiWrappingPopover
          isOpen={true}
          button={tagOptionsButton!}
          closePopover={closePopover}
          anchorPosition="downCenter"
        >
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs">
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
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="primary"
                    disabled={!updatedName || updatedName === tagName}
                    onClick={() => {
                      handleRename(updatedName!);
                      closePopover();
                    }}
                  >
                    {i18n.translate('xpack.fleet.tagOptions.renameTagButtonText', {
                      defaultMessage: 'Rename',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={() => {
                  handleDelete();
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
