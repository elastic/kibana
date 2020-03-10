/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiLink,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import './drilldown_hello_bar.scss';
import { txtHideHelpButtonLabel, txtHelpText, txtViewDocsLinkLabel } from './i18n';

export interface DrilldownHelloBarProps {
  docsLink?: string;
  onHideClick?: () => void;
}

export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({
  docsLink,
  onHideClick = () => {},
}) => {
  return (
    <EuiCallOut
      iconType="help"
      data-test-subj={'drilldowns-welcome-message-test-subj'}
      title={
        <EuiFlexGroup className="drdHelloBar__content">
          <EuiFlexItem grow={true}>
            <EuiTextColor color="subdued">{txtHelpText}</EuiTextColor>
            {docsLink && (
              <>
                <EuiSpacer size={'xs'} />
                <EuiLink href={docsLink}>{txtViewDocsLinkLabel}</EuiLink>
              </>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={onHideClick}>
              <EuiTextColor color="subdued">{txtHideHelpButtonLabel}</EuiTextColor>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
