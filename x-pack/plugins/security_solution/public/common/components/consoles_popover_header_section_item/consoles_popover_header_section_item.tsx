/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { EuiHeaderSectionItem, EuiHeaderSectionItemButton, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

const LABELS = Object.freeze({
  buttonLabel: i18n.translate('xpack.securitySolution.consolesPopoverHeaderItem.buttonLabel', {
    defaultMessage: 'Endpoint consoles',
  }),
});

const ConsolesPopover = memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const handlePopoverToggle = useCallback(() => {
    setIsPopoverOpen((prevState) => !prevState);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const buttonTextProps = useMemo(() => {
    return { style: { fontSize: '1rem' } };
  }, []);

  return (
    <EuiHeaderSectionItem>
      <EuiPopover
        anchorPosition="downRight"
        id="consoles-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={LABELS.buttonLabel}
            color="primary"
            data-test-subj="endpointConsoles"
            iconType="console"
            iconSide="left"
            onClick={handlePopoverToggle}
            textProps={buttonTextProps}
          >
            {LABELS.buttonLabel}
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen}
        closePopover={handlePopoverClose}
        repositionOnScroll
      >
        {
          'TODO: Currently open consoles and the ability to start a new console will be shown here soon'
        }
      </EuiPopover>
    </EuiHeaderSectionItem>
  );
});
ConsolesPopover.displayName = 'ConsolesPopover';

export const ConsolesPopoverHeaderSectionItem = memo((props) => {
  const canAccessEndpointManagement =
    useUserPrivileges().endpointPrivileges.canAccessEndpointManagement;
  const isExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsConsoleEnabled'
  );

  return canAccessEndpointManagement && isExperimentalFeatureEnabled ? <ConsolesPopover /> : null;
});
ConsolesPopoverHeaderSectionItem.displayName = 'ConsolesPopoverHeaderSectionItem';
