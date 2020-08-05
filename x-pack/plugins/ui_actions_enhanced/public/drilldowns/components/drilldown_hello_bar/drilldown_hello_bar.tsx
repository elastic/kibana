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
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';
import { txtHideHelpButtonLabel, txtHelpText, txtViewDocsLinkLabel } from './i18n';

export interface DrilldownHelloBarProps {
  docsLink?: string;
  onHideClick?: () => void;
}

export const WELCOME_MESSAGE_TEST_SUBJ = 'drilldownsWelcomeMessage';

export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({
  docsLink,
  onHideClick = () => {},
}) => {
  return (
    <EuiCallOut data-test-subj={WELCOME_MESSAGE_TEST_SUBJ}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <div style={{ marginLeft: '8px' }}>
            <EuiIcon type="help" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiText size={'s'}>
            <EuiTextColor color="subdued">{txtHelpText}</EuiTextColor>
          </EuiText>
          {docsLink && (
            <>
              <EuiSpacer size={'xs'} />
              <EuiLink href={docsLink} target="_blank" external>
                {txtViewDocsLinkLabel}
              </EuiLink>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" onClick={onHideClick}>
            {txtHideHelpButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
