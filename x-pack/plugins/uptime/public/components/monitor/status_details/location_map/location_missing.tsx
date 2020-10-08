/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { LocationLink } from '../../../common/location_link';

const EuiPopoverRight = styled(EuiFlexItem)`
  margin-left: auto;
  margin-bottom: 3px;
  margin-right: 5px;
`;

export const LocationMissingWarning = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const button = (
    <EuiButton iconType="alert" size="s" color="warning" onClick={togglePopover}>
      <FormattedMessage
        id="xpack.uptime.locationMap.locations.missing.title"
        defaultMessage="Geo Information Missing"
      />
    </EuiButton>
  );

  return (
    <EuiFlexGroup
      data-test-subj="xpack.uptime.locationMap.locationMissing"
      gutterSize="none"
      responsive={false}
    >
      <EuiPopoverRight grow={false}>
        <EuiPopover
          id="popover"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={togglePopover}
        >
          <EuiText style={{ width: '350px' }}>
            <FormattedMessage
              id="xpack.uptime.locationMap.locations.missing.message"
              defaultMessage="Important geo location configuration is missing.
              You can use the {codeBlock} field to create distinctive geographic regions for
               your uptime checks."
              values={{ codeBlock: <EuiCode>observer.geo.??</EuiCode> }}
            />
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText style={{ width: '350px' }}>
            <FormattedMessage
              id="xpack.uptime.locationMap.locations.missing.message1"
              defaultMessage="Get more information in our documentation."
            />
            <EuiSpacer size="xs" />
            <LocationLink />
          </EuiText>
        </EuiPopover>
      </EuiPopoverRight>
    </EuiFlexGroup>
  );
};
