/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { Overrides } from './overrides';

export class EditFlyout extends Component {
  constructor(props) {
    super(props);

    this.applyOverrides = () => {};
  }

  applyAndClose = () => {
    this.applyOverrides();
    this.props.closeEditFlyout();
  }

  setApplyOverrides = (applyOverrides) => {
    this.applyOverrides = applyOverrides;
  }
  unsetApplyOverrides = () => {
    this.applyOverrides = () => {};
  }

  render() {
    const { isFlyoutVisible, closeEditFlyout } = this.props;
    const {
      setOverrides,
      overrides,
      originalSettings,
      fields,
    } = this.props;

    return (
      <React.Fragment>
        { isFlyoutVisible &&

          <EuiFlyout
            // ownFocus
            onClose={closeEditFlyout}
            size="m"
          >
            <EuiFlyoutHeader>
              <EuiTitle>
                <h2>
                  Override settings
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>

              <Overrides
                setOverrides={setOverrides}
                overrides={overrides}
                originalSettings={originalSettings}
                setApplyOverrides={this.setApplyOverrides}
                fields={fields}
              />

              {/* <EuiTabbedContent
                tabs={tabs}
                initialSelectedTab={tabs[0]}
                onTabClick={() => { }}
              /> */}

            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    onClick={closeEditFlyout}
                    flush="left"
                  >
                    Close
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={this.applyAndClose}
                    fill
                    // isDisabled={(isValidJobDetails === false) || (isValidJobCustomUrls === false)}
                  >
                    Apply
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        }
      </React.Fragment>
    );
  }
}
