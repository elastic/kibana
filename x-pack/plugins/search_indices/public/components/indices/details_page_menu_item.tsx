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
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';

interface SearchIndexDetailsPageMenuItemPopoverProps {
  handleDeleteIndexModal: () => void;
  playgroundOnClick: () => void;
}
export const SearchIndexDetailsPageMenuItemPopover = ({
  handleDeleteIndexModal,
  playgroundOnClick,
}: SearchIndexDetailsPageMenuItemPopoverProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const { docLinks } = useKibana().services;

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
      <EuiContextMenuPanel
        data-test-subj="moreOptionsContextMenu"
        items={[
          <EuiContextMenuItem
            key="launch"
            icon={<EuiIcon type="launch" />}
            onClick={playgroundOnClick}
            size="s"
            color="danger"
            data-test-subj="moreOptionsPlayground"
          >
            <EuiText size="s">
              {i18n.translate('xpack.searchIndices.moreOptions.playgroundLabel', {
                defaultMessage: 'Use in Playground',
              })}
            </EuiText>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="documentation"
            icon={<EuiIcon type="documentation" />}
            href={docLinks.links.apiReference}
            size="s"
            target="_blank"
            data-test-subj="moreOptionsApiReference"
          >
            <EuiText size="s">
              {i18n.translate('xpack.searchIndices.moreOptions.apiReferenceLabel', {
                defaultMessage: 'API Reference',
              })}
            </EuiText>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="trash"
            icon={<EuiIcon type="trash" color="danger" />}
            onClick={handleDeleteIndexModal}
            size="s"
            color="danger"
            data-test-subj="moreOptionsDeleteIndex"
          >
            <EuiText size="s" color="danger">
              {i18n.translate('xpack.searchIndices.moreOptions.deleteIndexLabel', {
                defaultMessage: 'Delete Index',
              })}
            </EuiText>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
