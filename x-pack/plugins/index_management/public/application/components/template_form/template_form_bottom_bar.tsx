/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

export const TemplateFormBottomBar = () => {
  return (
    <EuiBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween">
        {/* Left content */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              {/* <EuiButton color="ghost" size="s" iconType="help">
                Help
              </EuiButton> */}
              <EuiText>Configure</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* <EuiButton color="ghost" size="s" iconType="user">
                Add user
              </EuiButton> */}
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="ghost" size="s">
                    Inherit from components
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty color="ghost" size="s">
                    Inherit from templates
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Action button (Right) */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross">
                Back
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill size="s" iconType="check">
                Next
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
