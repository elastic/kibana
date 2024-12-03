/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from '../translations';

interface Props {
  closeModal: () => void;
  onReset: () => void;
  onSave: () => void;
}

const FooterComponent: React.FC<Props> = ({ closeModal, onReset, onSave }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty data-test-subj="reset" flush="both" onClick={onReset} size="s">
          {i18n.RESET}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem
            css={css`
              margin-right: ${euiTheme.size.s};
            `}
            grow={false}
          >
            <EuiButtonEmpty data-test-subj="cancel" onClick={closeModal} size="s">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="save" fill onClick={onSave} size="s">
              {i18n.SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

FooterComponent.displayName = 'Footer';

export const Footer = React.memo(FooterComponent);
