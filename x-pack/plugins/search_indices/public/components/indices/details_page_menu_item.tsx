/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';

interface SearchIndexDetailsPageMenuItemPopoverProps {
  handleDeleteIndexModal: () => void;
  showApiReference: boolean;
}

export const SearchIndexDetailsPageMenuItemPopover = ({
  showApiReference = false,
  handleDeleteIndexModal,
}: SearchIndexDetailsPageMenuItemPopoverProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const { docLinks } = useKibana().services;
  const contextMenuItems = [
    showApiReference && (
      <EuiContextMenuItem
        key="apiReference"
        icon={<EuiIcon type="documentation" />}
        href={docLinks.links.apiReference}
        size="s"
        target="_blank"
        data-test-subj="moreOptionsApiReference"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.searchIndices.moreOptions.apiReferenceLabel"
            defaultMessage="API Reference"
          />
        </EuiText>
      </EuiContextMenuItem>
    ),
    <EuiContextMenuItem
      key="deleteIndex"
      icon={<EuiIcon color="danger" type="trash" />}
      size="s"
      onClick={handleDeleteIndexModal}
      data-test-subj="moreOptionsDeleteIndex"
      color="danger"
    >
      <EuiText size="s" color="danger">
        <FormattedMessage
          id="xpack.searchIndices.moreOptions.deleteIndexLabel"
          defaultMessage="Delete Index"
        />
      </EuiText>
    </EuiContextMenuItem>,
  ].filter(Boolean) as ReactElement[];

  return (
    <EuiPopover
      isOpen={showMoreOptions}
      closePopover={() => setShowMoreOptions(!showMoreOptions)}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          size="m"
          data-test-subj="moreOptionsActionButton"
          aria-label={i18n.translate('xpack.searchIndices.moreOptions.ariaLabel', {
            defaultMessage: 'More options',
          })}
        />
      }
    >
      <EuiContextMenuPanel data-test-subj="moreOptionsContextMenu" items={contextMenuItems} />
    </EuiPopover>
  );
};
