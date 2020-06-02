/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonIcon,
  EuiSpacer,
  // EuiFormRow,
  EuiText,
  // EuiCodeEditor,
  // EuiCode,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';

interface Props {
  title: string | JSX.Element;
  subTitle: string | JSX.Element;
  children: JSX.Element;
  defaultExpanded?: boolean;
}

export const ConfigureSection = ({ title, subTitle, defaultExpanded = true, children }: Props) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="indexTemplateCreation_configureSection">
      <EuiFlexGroup
        className="indexTemplateCreation_configureSection__titleWrapper"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 className="eui-displayInlineBlock eui-alignMiddle indexTemplateCreation_configureSection__title">
              {title}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span className="indexTemplateCreation_configureSection__toggleMinimizeWindow">
            <EuiButtonIcon
              onClick={() => setIsExpanded((prev) => !prev)}
              iconType={isExpanded ? 'minimize' : 'expand'}
              aria-label="Minify"
            />
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiTextColor color="subdued">
        <EuiText size="xs">
          <p>{subTitle}</p>
        </EuiText>
      </EuiTextColor>

      {isExpanded ? (
        <>
          <EuiSpacer />
          {children}
        </>
      ) : null}
    </div>
  );
};
