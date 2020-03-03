/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiPopover, EuiFormRow, EuiButton, EuiLink, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

export const TakeActionDropdown = styled(
  memo(({ className }: { className?: string }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const TakeActionButton = useMemo(() => {
      return (
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <FormattedMessage
            id="xpack.endpoint.application.endpoint.alertDetails.overview.title"
            defaultMessage="Take Action"
          />
        </EuiButton>
      );
    }, [isDropdownOpen]);

    return (
      <EuiPopover
        button={TakeActionButton}
        isOpen={isDropdownOpen}
        closePopover={() => setIsDropdownOpen(false)}
      >
        <EuiFormRow>
          <EuiLink color="text" href="#">
            <EuiIcon type="folderCheck" />
            <FormattedMessage
              id="xpack.endpoint.application.endpoint.alertDetails.overview.title"
              defaultMessage="Close Alert"
            />
          </EuiLink>
        </EuiFormRow>

        <EuiFormRow>
          <EuiLink color="text" href="#">
            <EuiIcon type="listAdd" />
            <FormattedMessage
              id="xpack.endpoint.application.endpoint.alertDetails.overview.title"
              defaultMessage="Whitelist..."
            />
          </EuiLink>
        </EuiFormRow>
      </EuiPopover>
    );
  })
)``;
