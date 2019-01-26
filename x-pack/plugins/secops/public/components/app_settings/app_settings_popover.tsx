/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPopover } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

interface Props {
  showPopover: boolean;
  onClick: () => void;
  onClose: () => void;
}

const SettingsPopover = styled(EuiPopover)`
  cursor: pointer;
`;

export const AppSettingsPopover = pure<Props>(({ showPopover, onClick, onClose }) => (
  <SettingsPopover
    anchorPosition="downRight"
    button={<EuiIcon data-test-subj="gear" type="gear" size="l" onClick={onClick} />}
    closePopover={onClose}
    data-test-subj="app-settings-popover"
    id="timelineSettingsPopover"
    isOpen={showPopover}
  >
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="add-data"
          href="kibana#home/tutorial_directory/security"
          target="_blank"
        >
          {i18n.ADD_DATA}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </SettingsPopover>
));
