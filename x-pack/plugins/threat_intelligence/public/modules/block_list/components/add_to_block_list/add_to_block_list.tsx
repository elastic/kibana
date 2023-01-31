/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBlockListContext } from '../../../indicators/hooks/use_block_list_context';
import { useSetUrlParams } from '../../hooks/use_set_url_params';

export interface AddToBlockListProps {
  /**
   * Indicator's filehash value (either sha256, sha1 or md5)
   */
  data: string | null;
  /**
   * Used for unit and e2e tests
   */
  ['data-test-subj']?: string;
  /**
   * Click event to notify the parent component (to for example close the popover)
   */
  onClick: () => void;
}

/**
 * Add to blocklist functionality displayed as a ContextMenuItem (in the main indicators table row and in the indicator flyout).
 * The entry is disabled is the filehash isn't sha256, sha1 or md5.
 * When clicking on the ContextMenuItem, the indicator filehash value is saved in context.
 * The flyout is shown by adding a parameter to the url.
 */
export const AddToBlockListContextMenu: VFC<AddToBlockListProps> = ({
  data,
  'data-test-subj': dataTestSub,
  onClick,
}) => {
  const { setBlockListIndicatorValue } = useBlockListContext();
  const { setUrlParams } = useSetUrlParams();

  const menuItemClicked = () => {
    onClick();
    setBlockListIndicatorValue(data as string);
    setUrlParams({ show: 'create' });
  };

  return (
    <EuiContextMenuItem
      key="addToBlocklist"
      onClick={() => menuItemClicked()}
      data-test-subj={dataTestSub}
      disabled={data == null}
    >
      <FormattedMessage
        defaultMessage="Add blocklist entry"
        id="xpack.threatIntelligence.addToBlockList"
      />
    </EuiContextMenuItem>
  );
};
