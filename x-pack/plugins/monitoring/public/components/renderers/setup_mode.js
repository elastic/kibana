/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { setAngularState, getSetupModeState, initSetupModeState, updateSetupModeData } from '../../lib/setup_mode';
import { Flyout } from '../metricbeat_migration/flyout';

export class SetupModeRenderer extends React.Component {
  state = { renderState: false, isFlyoutOpen: false, instanceUuid: null }

  componentWillMount() {
    const { scope, injector } = this.props;
    setAngularState(scope, injector);
    initSetupModeState(() => this.setState({ renderState: false }));
  }

  getFlyout(data) {
    const { productName } = this.props;
    const { isFlyoutOpen, instanceUuid } = this.state;
    if (!data || !isFlyoutOpen) {
      return null;
    }

    const product = data.byUuid[instanceUuid];
    return (
      <Flyout
        onClose={() => this.setState({ isFlyoutOpen: false })}
        productName={productName}
        product={product}
      />
    );
  }

  render() {
    const { render, productName } = this.props;
    const setupModeState = getSetupModeState();
    const data = setupModeState.data ? setupModeState.data[productName] : null;

    return render({
      setupMode: {
        data,
        enabled: setupModeState.enabled,
        updateSetupModeData,
        openFlyout: (instanceUuid) => this.setState({ isFlyoutOpen: true, instanceUuid }),
        closeFlyout: () => this.setState({ isFlyoutOpen: false }),
      },
      flyoutComponent: this.getFlyout(data),
    });
  }
}
