/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/css';
import { EuiPopover, EuiLink, EuiText } from '@elastic/eui';
import { ConnectorSetup } from './connector_setup';
import * as i18n from '../translations';

interface CreateConnectorPopoverProps {
  onConnectorSaved: () => void;
}

export const CreateConnectorPopover = React.memo<CreateConnectorPopoverProps>(
  ({ onConnectorSaved }) => {
    const [isOpen, setIsPopoverOpen] = useState(false);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const onButtonClick = useCallback(
      () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen),
      []
    );

    return (
      <EuiPopover
        className={css`
          width: fit-content;
        `}
        button={
          <EuiText size="s">
            <EuiLink data-test-subj="createConnectorPopoverButton" onClick={onButtonClick}>
              {i18n.ASSISTANT_CARD_CREATE_NEW_CONNECTOR_POPOVER}
            </EuiLink>
          </EuiText>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        data-test-subj="createConnectorPopover"
      >
        <ConnectorSetup onConnectorSaved={onConnectorSaved} onClose={closePopover} compressed />
      </EuiPopover>
    );
  }
);
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
