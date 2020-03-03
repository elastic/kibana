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
import './index.scss';
import { txtHideHelpButtonLabel, txtHelpText, txtViewDocsLinkLabel } from './i18n';

export interface DrilldownHelloBarProps {
  docsLink?: string;
  onHideClick?: () => void;
}

/**
 * @todo improve with https://github.com/elastic/eui/pull/2837 when newer eui is merged into kibana
 */
export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({
  docsLink,
  onHideClick = () => {},
}) => {
  return (
    <EuiCallOut
      iconType="help"
      title={
        <EuiFlexGroup className="drilldowns__helloBarContent">
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
