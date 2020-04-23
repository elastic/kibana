/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  getSetupModeState,
  initSetupModeState,
  updateSetupModeData,
  disableElasticsearchInternalCollection,
  toggleSetupMode,
  setSetupModeMenuItem,
} from '../../lib/setup_mode';
import { Flyout } from '../metricbeat_migration/flyout';
import {
  EuiBottomBar,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import { findNewUuid } from './lib/find_new_uuid';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export class SetupModeRenderer extends React.Component {
  state = {
    renderState: false,
    isFlyoutOpen: false,
    instance: null,
    newProduct: null,
    isSettingUpNew: false,
  };

  UNSAFE_componentWillMount() {
    const { scope, injector } = this.props;
    initSetupModeState(scope, injector, _oldData => {
      const newState = { renderState: true };
      const { productName } = this.props;
      if (!productName) {
        this.setState(newState);
        return;
      }

      const setupModeState = getSetupModeState();
      if (!setupModeState.enabled || !setupModeState.data) {
        this.setState(newState);
        return;
      }

      const data = setupModeState.data[productName];
      const oldData = _oldData ? _oldData[productName] : null;
      if (data && oldData) {
        const newUuid = findNewUuid(Object.keys(oldData.byUuid), Object.keys(data.byUuid));
        if (newUuid) {
          newState.newProduct = data.byUuid[newUuid];
        }
      }

      this.setState(newState);
    });
    setSetupModeMenuItem();
  }

  reset() {
    this.setState({
      renderState: false,
      isFlyoutOpen: false,
      instance: null,
      newProduct: null,
      isSettingUpNew: false,
    });
  }

  getFlyout(data, meta) {
    const { productName } = this.props;
    const { isFlyoutOpen, instance, isSettingUpNew, newProduct } = this.state;
    if (!data || !isFlyoutOpen) {
      return null;
    }

    let product = null;
    if (newProduct) {
      product = newProduct;
    }
    // For new instance discovery flow, we pass in empty instance object
    else if (instance && Object.keys(instance).length) {
      product = data.byUuid[instance.uuid];
    }

    if (!product) {
      const uuids = Object.values(data.byUuid);
      if (uuids.length && !isSettingUpNew) {
        product = uuids[0];
      } else {
        product = {
          isNetNewUser: true,
        };
      }
    }

    return (
      <Flyout
        onClose={() => this.reset()}
        productName={productName}
        product={product}
        meta={meta}
        instance={instance}
        updateProduct={updateSetupModeData}
        isSettingUpNew={isSettingUpNew}
      />
    );
  }

  getBottomBar(setupModeState) {
    if (!setupModeState.enabled) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="xxl" />
        <EuiBottomBar>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTextColor color="ghost">
                    <FormattedMessage
                      id="xpack.monitoring.setupMode.description"
                      defaultMessage="You are in setup mode. The ({flagIcon}) icon indicates configuration options."
                      values={{
                        flagIcon: <EuiIcon type="flag" />,
                      }}
                    />
                  </EuiTextColor>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="danger"
                    fill
                    iconType="flag"
                    iconSide="right"
                    size="s"
                    onClick={() => toggleSetupMode(false)}
                  >
                    {i18n.translate('xpack.monitoring.setupMode.exit', {
                      defaultMessage: `Exit setup mode`,
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      </Fragment>
    );
  }

  async shortcutToFinishMigration() {
    await disableElasticsearchInternalCollection();
    await updateSetupModeData();
  }

  render() {
    const { render, productName } = this.props;
    const setupModeState = getSetupModeState();

    let data = null;
    if (setupModeState.data) {
      if (productName) {
        data = setupModeState.data[productName];
      } else {
        data = setupModeState.data;
      }
    }

    const meta = setupModeState.data ? setupModeState.data._meta : null;

    return render({
      setupMode: {
        data,
        meta,
        enabled: setupModeState.enabled,
        productName,
        updateSetupModeData,
        shortcutToFinishMigration: () => this.shortcutToFinishMigration(),
        openFlyout: (instance, isSettingUpNew) =>
          this.setState({ isFlyoutOpen: true, instance, isSettingUpNew }),
        closeFlyout: () => this.setState({ isFlyoutOpen: false }),
      },
      flyoutComponent: this.getFlyout(data, meta),
      bottomBarComponent: this.getBottomBar(setupModeState),
    });
  }
}
